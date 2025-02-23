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
			captionTracks: {
				baseUrl: string;
				vssId: string;
				languageCode: string;
				kind?: string;
			}[];
		};
	};
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

export interface CaptionConfig {
	id: string;
	translation?: string;
}

export interface CaptionConfigOption {
	name: string;
	captionConfig: CaptionConfig;
}

export interface CaptionConfigOptions {
	captions: CaptionConfigOption[];
	translationGroups: {
		name: string;
		translations: CaptionConfigOption[];
	}[];
}

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
