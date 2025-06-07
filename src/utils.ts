import { HashKeyDefaultMap, sortBy, tinyassert, zip } from "@hiogawa/utils";

// https://github.com/hi-ogawa/ytsub-v3/blob/659b3217f5b58490dd21a1b0a0cfe48d37cf6b7c/app/utils/youtube.ts#L32-L33

export interface VideoMetadata {
	videoDetails: {
		videoId: string;
		title: string;
		author: string;
		channelId: string;
	};
	playabilityStatus: {
		status: string;
		playableInEmbed: boolean;
	};
	captions?: {
		playerCaptionsTracklistRenderer: {
			captionTracks: CaptionTrackMetadata[];
		};
	};
}

export type CaptionTrackMetadata = {
	baseUrl: string;
	vssId: string;
	languageCode: string;
	kind?: string;
	name: {
		runs: { text: string }[];
	};
};

export function captionTrackName(metadata: CaptionTrackMetadata): string {
	return (
		metadata.name.runs.map((r) => r.text).join("") || metadata.languageCode
	);
}

export const DUMMY_VIDEO_METADATA: VideoMetadata = {
	videoDetails: {
		videoId: "(videoId)",
		title: "(title)",
		author: "(author)",
		channelId: "(channelId)",
	},
	playabilityStatus: {
		status: "OK",
		playableInEmbed: true,
	},
	captions: {
		playerCaptionsTracklistRenderer: { captionTracks: [] },
	},
};

export interface CaptionEntry {
	index: number;
	begin: number;
	end: number;
	text1: string;
	text2: string;
}

export async function fetchMetadataJson(
	videoId: string,
): Promise<VideoMetadata> {
	const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
		method: "POST",
		body: JSON.stringify({
			videoId,
			context: {
				client: {
					clientName: "IOS",
					clientVersion: "19.45.4",
					deviceMake: "Apple",
					deviceModel: "iPhone16,2",
					userAgent:
						"com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
					osName: "iPhone",
					osVersion: "18.1.0.22B83",
					hl: "en",
					timeZokne: "UTC",
					utcOffsetMinutes: 0,
				},
			},
			playbackContext: {
				contentPlaybackContext: {
					html5Preference: "HTML5_PREF_WANTS",
					signatureTimestamp: 20073,
				},
			},
			contentCheckOk: true,
			racyCheckOk: true,
		}),
		headers: {
			"X-YouTube-Client-Name": "5",
			"X-YouTube-Client-Version": "19.45.4",
			Origin: "https://www.youtube.com",
			"User-Agent":
				"com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
			"content-type": "application/json",
			"X-Goog-Visitor-Id": "CgtwU3N6UXVjakdWbyi94bi7BjIKCgJKUBIEGgAgUQ%3D%3D",
		},
	});
	return await res.json();
}

export function parseVideoId(value: string): string | undefined {
	if (value.length === 11) {
		return value;
	}
	if (value.match(/youtube\.com|youtu\.be/)) {
		try {
			const url = new URL(value);
			if (url.hostname === "youtu.be") {
				return url.pathname.substring(1);
			} else {
				const videoId = url.searchParams.get("v");
				if (videoId) {
					return videoId;
				}
			}
		} catch {}
	}
	return;
}

export async function fetchCaptionEntries({
	language1,
	language2,
}: {
	language1: CaptionTrackMetadata;
	language2: CaptionTrackMetadata;
}): Promise<CaptionEntry[]> {
	const [track1, track2] = await Promise.all([
		fetchCaptionTrack(language1),
		fetchCaptionTrack(language2),
	]);
	return mergeCaptionEntryPairs(convertJson3(track1), convertJson3(track2));
}

export async function fetchCaptionTrack(
	captionTrackMetadata: CaptionTrackMetadata,
): Promise<CaptionTrackJson3> {
	const url = new URL(captionTrackMetadata.baseUrl);
	url.searchParams.set("fmt", "json3");
	const res = await fetch(url);
	tinyassert(res.ok);
	return res.json();
}

interface CaptionTrackJson3 {
	events: {
		tStartMs: number;
		dDurationMs: number;
		segs: {
			utf8: string;
		}[];
	}[];
}

function convertJson3(data: CaptionTrackJson3): CaptionEntryRaw[] {
	return data.events.map((e) => {
		const begin = e.tStartMs / 1000;
		const end = begin + e.dDurationMs / 1000;
		const text = e.segs.map((seg) => seg.utf8).join(" ");
		return { begin, end, text };
	});
}

interface CaptionEntryRaw {
	begin: number;
	end: number;
	text: string;
}

function mergeCaptionEntryPairs(
	entries1: CaptionEntryRaw[],
	entries2: CaptionEntryRaw[],
): CaptionEntry[] {
	// try simple case first
	const found = mergeCaptionEntryPairsSimple(entries1, entries2);
	if (found) {
		return found;
	}

	// otherwise a bit complicated heuristics
	return entries1.map((e1, index) => {
		const isects = entries2
			.map((e2) => [e2, computeIntersection(e1, e2)] as const)
			.filter(([, isect]) => isect > 0);
		const candidates = isects.filter(([, isect]) => isect >= 2);
		let text2 = "";
		if (candidates.length > 0) {
			// Merge all entries with overlap >= 2s
			text2 = candidates.map(([e2]) => e2.text).join("");
		} else if (isects.length > 0) {
			// Or take maximum overlap
			const found = sortBy(isects, ([, isect]) => isect).at(-1);
			tinyassert(found);
			text2 = found[0].text;
		}
		return {
			index,
			begin: e1.begin,
			end: e1.end,
			text1: e1.text,
			text2,
		};
	});
}

// handle sane and simplest case where all intervals share the same timestamp interval
function mergeCaptionEntryPairsSimple(
	entries1: CaptionEntryRaw[],
	entries2: CaptionEntryRaw[],
): CaptionEntry[] | undefined {
	// group entries by timestamp
	const map = new HashKeyDefaultMap<
		{ begin: number; end: number },
		[CaptionEntryRaw[], CaptionEntryRaw[]]
	>(() => [[], []]);

	for (const e of entries1) {
		map.get({ begin: e.begin, end: e.end })[0].push(e);
	}

	for (const e of entries2) {
		map.get({ begin: e.begin, end: e.end })[1].push(e);
	}

	// to array
	let entries = [...map.entries()];
	entries = sortBy(entries, ([k]) => k.begin);

	// give up if overlap
	for (const [[curr], [next]] of zip(entries, entries.slice(1))) {
		if (curr.end > next.begin) {
			return;
		}
	}

	// give up if one side has many entries
	for (const [, [lefts, rights]] of entries) {
		if (lefts.length >= 2 || rights.length >= 2) {
			return;
		}
	}

	return entries.map(([k, [lefts, rights]], i) => ({
		index: i,
		begin: k.begin,
		end: k.end,
		// fill blank if one side is empry
		text1: lefts.at(0)?.text ?? "",
		text2: rights.at(0)?.text ?? "",
	}));
}

function computeIntersection(e1: CaptionEntryRaw, e2: CaptionEntryRaw): number {
	// length of intersection of [begin, end] intervals
	const left = Math.max(e1.begin, e2.begin);
	const right = Math.min(e1.end, e2.end);
	return Math.max(right - left, 0);
}

export function parseTimestamp(text: string): number {
	const [h, m, s] = text.split(":").map(Number) as [number, number, number];
	return (h * 60 + m) * 60 + s;
}

export function stringifyTimestamp(s: number): string {
	let ms = (s * 1000) % 1000;
	let m = s / 60;
	s = s % 60;
	let h = m / 60;
	m = m % 60;

	// printf "%0Nd"
	function D(x: number, N: number) {
		return String(Math.floor(x)).padStart(N, "0");
	}

	return `${D(h, 2)}:${D(m, 2)}:${D(s, 2)}.${D(ms, 3)}`;
}
