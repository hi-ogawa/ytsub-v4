import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { storage } from "@wxt-dev/storage";
import React from "react";
import { cls, SelectWrapper } from "../../ui";
import {
	type CaptionEntry,
	type CaptionTrackMetadata,
	captionTrackName,
	fetchCaptionEntries,
	stringifyTimestamp,
	type VideoMetadata,
} from "../../utils";
import { sendMessage } from "../content/rpc";

const queryClient = new QueryClient();

const searchParams = new URL(window.location.href).searchParams;
const tabId = Number(searchParams.get("tabId"));
const videoId = String(searchParams.get("videoId"));

// TODO:
// - normalize videoMetadata and cache
// - cache last loaded language pair
// - cache last loaded captions

type VideoCache = {};

const videoCache = storage.defineItem<VideoCache>(`local:video-${videoId}`, {
	fallback: {},
});
videoCache;

export function Root() {
	return (
		<QueryClientProvider client={queryClient}>
			<RootInner />
		</QueryClientProvider>
	);
}

function RootInner() {
	videoId;

	const query = useQuery({
		queryKey: ["fetchMetadata"],
		queryFn: async () => {
			const result = await sendMessage("fetchMetadata", undefined, { tabId });
			return result;
		},
		staleTime: Infinity,
		gcTime: Infinity,
	});

	return (
		<div className="p-2 flex flex-col gap-2">
			{query.isError && (
				<div role="alert" className="alert alert-error alert-soft text-sm">
					<span>Failed to load captions data</span>
				</div>
			)}
			{query.data && <MainView metadata={query.data} />}
		</div>
	);
}

function MainView(props: { metadata: VideoMetadata }) {
	const [lang1, setLang1] = React.useState<CaptionTrackMetadata>();
	const [lang2, setLang2] = React.useState<CaptionTrackMetadata>();
	const [captionEntries, setCaptionEntries] = React.useState<CaptionEntry[]>();

	const captionTracks =
		props.metadata.captions?.playerCaptionsTracklistRenderer.captionTracks;
	if (!captionTracks) {
		return <div>No captions available.</div>;
	}

	return (
		<>
			<div className="flex gap-2 items-stretch">
				<SelectWrapper
					className="select"
					value={lang1}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLang1(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<SelectWrapper
					className="select"
					value={lang2}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLang2(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<button
					className={cls(`btn p-2`, !(lang1 && lang2) && "btn-disabled")}
					onClick={async () => {
						if (!lang1 || !lang2) return;
						const result = await fetchCaptionEntries({
							language1: lang1,
							language2: lang2,
						});
						setCaptionEntries(result);
					}}
				>
					<span className="icon-[ri--refresh-line] text-lg"></span>
				</button>
			</div>
			{captionEntries && <CaptionsView captionEntries={captionEntries} />}
		</>
	);
}

// TODO: virtual scroll list
// - test 50 min video https://www.youtube.com/watch?v=V07nRDc1J18
function CaptionsView(props: { captionEntries: CaptionEntry[] }) {
	const query = useQuery({
		queryKey: ["getState"],
		queryFn: async () => {
			const result = await sendMessage("getState", undefined, { tabId });
			return result;
		},
		initialData: { playing: false, time: 0, mounted: true },
		refetchInterval: 200,
	});
	const state = query.data;
	const currentEntry = findCurrentEntry(props.captionEntries, state.time);

	return (
		<div className="flex flex-col gap-2 text-sm">
			{props.captionEntries.map((e) => (
				<div
					key={e.index}
					className={cls(
						"flex flex-col gap-1 p-1.5 rounded-md border-1 cursor-pointer",
						e === currentEntry
							? "bg-green-100 hover:bg-green-200 border-green-300"
							: "bg-gray-100 hover:bg-gray-200 border-gray-300",
					)}
					onClick={async () => {
						const selection = window.getSelection();
						if (!selection || !selection.isCollapsed) return;

						await sendMessage("play", e.begin, { tabId });
					}}
				>
					<div className="text-xs text-gray-500">
						<span>
							{stringifyTimestamp(e.begin)} - {stringifyTimestamp(e.end)}
						</span>
					</div>
					<div className="flex gap-1.5">
						<div className="flex-1">{e.text1}</div>
						<span className="border-l border-gray-300"></span>
						<div className="flex-1">{e.text2}</div>
					</div>
				</div>
			))}
		</div>
	);
}

// better heuristics than simple `begin <= time && time <= end`
function findCurrentEntry(
	entries: CaptionEntry[],
	time: number,
): CaptionEntry | undefined {
	for (let i = entries.length - 1; i >= 0; i--) {
		if (entries[i]!.begin <= time) {
			return entries[i];
		}
	}
	return;
}
