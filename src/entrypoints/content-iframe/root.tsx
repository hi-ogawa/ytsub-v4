import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import React from "react";
import { storage } from "wxt/utils/storage";
import { cls, SelectWrapper } from "../../ui";
import {
	type CaptionEntry,
	type CaptionTrackMetadata,
	captionTrackName,
	fetchCaptionEntries,
	stringifyTimestamp,
} from "../../utils";
import { WxtStorageStore } from "../../utils/storage";
import { createContentServiceClient } from "../content/rpc";

const queryClient = new QueryClient();

const uiParams = new URL(window.location.href).searchParams;
const tabId = Number(uiParams.get("tabId"));
const videoId = String(uiParams.get("videoId"));

const rpc = createContentServiceClient(tabId);

type VideoStorageData = {
	lastSelected?: {
		language1: CaptionTrackMetadata;
		language2: CaptionTrackMetadata;
		captionEntries: CaptionEntry[];
	};
};

const videoStorage = storage.defineItem<VideoStorageData>(
	`local:video-${videoId}`,
	{
		fallback: {},
	},
);

const autoScrollStore = new WxtStorageStore(
	storage.defineItem<boolean>(`local:video-${videoId}-auto-scroll`, {
		fallback: true,
	}),
);

export function Root() {
	return (
		<QueryClientProvider client={queryClient}>
			<RootInner />
		</QueryClientProvider>
	);
}

function RootInner() {
	const query = useQuery({
		queryKey: ["fetchMetadata"],
		queryFn: async () => {
			const metadata = await rpc.fetchMetadata(videoId);
			const storageData = await videoStorage.getValue();
			return { metadata, storageData };
		},
		staleTime: Infinity,
		gcTime: Infinity,
	});

	return (
		<div className="p-2 flex flex-col gap-2 h-full bg-white rounded border-1 border-gray-300">
			{query.isError && (
				<div role="alert" className="alert alert-error alert-soft text-sm">
					<span>Failed to load captions</span>
				</div>
			)}
			{query.isSuccess &&
				(() => {
					const captionTracks =
						query.data.metadata.captions?.playerCaptionsTracklistRenderer
							.captionTracks;
					if (!captionTracks || captionTracks.length === 0) {
						return (
							<div
								role="alert"
								className="alert alert-error alert-soft text-sm"
							>
								<span>Failed to load captions</span>
							</div>
						);
					}
					return (
						<MainView
							captionTracks={captionTracks}
							storageData={query.data.storageData}
						/>
					);
				})()}
		</div>
	);
}

function MainView(props: {
	captionTracks: CaptionTrackMetadata[];
	storageData: VideoStorageData;
}) {
	const captionTracks = props.captionTracks;
	const lastData = props.storageData.lastSelected;
	const [language1, setLanauge2] = React.useState(
		() =>
			lastData?.language1 &&
			captionTracks.find((e) => e.vssId === lastData.language1.vssId),
	);
	const [language2, setLanguage2] = React.useState(
		() =>
			lastData?.language2 &&
			captionTracks.find((e) => e.vssId === lastData.language2.vssId),
	);
	const [captionEntries, setCaptionEntries] = React.useState(
		lastData?.captionEntries,
	);
	// const [autoScroll, setAutoScroll] = useAutoScroll();
	const autoScroll = useStore(autoScrollStore);

	async function loadCaptionEntries() {
		if (!language1 || !language2) return;
		const entries = await fetchCaptionEntries({
			language1,
			language2,
		});
		setCaptionEntries(entries);
		videoStorage.setValue({
			lastSelected: {
				language1,
				language2,
				captionEntries: entries,
			},
		});
	}

	React.useEffect(() => {
		loadCaptionEntries();
	}, [language1, language2]);

	return (
		<>
			<div className="flex gap-2 items-stretch">
				<SelectWrapper
					className="select"
					value={language1}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLanauge2(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<SelectWrapper
					className="select"
					value={language2}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLanguage2(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<details className="dropdown dropdown-end">
					<summary className="btn p-2">
						<span className="icon-[ri--settings-3-line] text-lg"></span>
					</summary>
					<ul className="menu dropdown-content rounded-box z-1 w-40 mt-1 p-2 bg-gray-100 border-1 border-gray-300">
						<li
							onClick={() => {
								autoScrollStore.setState((prev) => !prev);
							}}
						>
							<span className="flex items-center">
								<span className="flex-1">Auto Scroll</span>
								{autoScroll && <span className="icon-[ri--check-line]"></span>}
							</span>
						</li>
						<li
							className={cls(!(language1 && language2) && "menu-disabled")}
							onClick={() => loadCaptionEntries()}
						>
							<span>Reload captions</span>
						</li>
						<li
							onClick={async () => {
								await rpc.hideUI();
							}}
						>
							<span>Hide captions</span>
						</li>
					</ul>
				</details>
			</div>
			{captionEntries && (
				<CaptionsView captionEntries={captionEntries} autoScroll={autoScroll} />
			)}
		</>
	);
}

function CaptionsView({
	captionEntries,
	autoScroll,
}: {
	captionEntries: CaptionEntry[];
	autoScroll: boolean;
}) {
	const query = useQuery({
		queryKey: ["getState"],
		queryFn: async () => {
			return rpc.getVideoState();
		},
		initialData: { playing: false, time: 0 },
		refetchInterval: 200,
	});
	const state = query.data;
	const currentEntry = React.useMemo(
		() => findCurrentEntry(captionEntries, state.time),
		[captionEntries, state.time],
	);

	React.useEffect(() => {
		if (!autoScroll || !currentEntry) return;
		const element = document.querySelector(
			`[data-entry-index="${currentEntry.index}"]`,
		);
		if (!element) return;

		// check element position
		const container = element.parentElement;
		if (!container) return;
		const containerRect = container.getBoundingClientRect();
		const elementRect = element.getBoundingClientRect();
		const current =
			(elementRect.top + elementRect.height / 2 - containerRect.top) /
			containerRect.height;
		if (Math.abs(current - 0.5) < 0.25) return;

		element.scrollIntoView({
			block: "center",
			inline: "center",
			behavior: "smooth",
		});
	}, [currentEntry, autoScroll]);

	return (
		<div className="flex flex-col gap-2 text-sm overflow-y-auto">
			{captionEntries.map((e) => (
				<CaptionEntryView
					key={e.index}
					entry={e}
					isCurrent={e === currentEntry}
				/>
			))}
		</div>
	);
}

function CaptionEntryView(props: { entry: CaptionEntry; isCurrent: boolean }) {
	return (
		<div
			data-entry-index={props.entry.index}
			className={cls(
				"flex flex-col gap-1 p-1.5 rounded-md border-1 cursor-pointer",
				props.isCurrent
					? "bg-green-100 hover:bg-green-200 border-green-300"
					: "bg-gray-100 hover:bg-gray-200 border-gray-300",
			)}
			onClick={async () => {
				const selection = window.getSelection();
				if (!selection || !selection.isCollapsed) return;
				await rpc.seek(props.entry.begin);
			}}
		>
			<div className="text-xs text-gray-500">
				<span>
					{stringifyTimestamp(props.entry.begin)} -{" "}
					{stringifyTimestamp(props.entry.end)}
				</span>
			</div>
			<div className="flex gap-1.5">
				<div className="flex-1">{props.entry.text1}</div>
				<span className="border-l border-gray-300"></span>
				<div className="flex-1">{props.entry.text2}</div>
			</div>
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
