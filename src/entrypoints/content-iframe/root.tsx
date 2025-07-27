import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import React from "react";
import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";
import { WxtStorageStore } from "../../utils/storage";
import { cls, SelectWrapper } from "../../utils/ui";
import {
	type CaptionEntry,
	type CaptionTrackMetadata,
	captionTrackName,
	fetchCaptionEntries,
	stringifyTimestamp,
} from "../../utils/youtube";
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
	storage.defineItem<boolean>(`local:video-${videoId}/auto-scroll`, {
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
		<div className="p-2 flex flex-col gap-2 h-full bg-white/95 rounded border-1 border-gray-300">
			{query.isPending && (
				<div className="flex items-center justify-center h-full">
					<span className="loading loading-spinner loading-lg"></span>
				</div>
			)}
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
	const [language1, setLanguage1] = React.useState(
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
	const [isCreatingCaptions, setIsCreatingCaptions] = React.useState(false);
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
		<div className="flex flex-col gap-2 h-full justify-end">
			{isCreatingCaptions ? (
				<CaptionCreatorView
					captionEntries={captionEntries || []}
					setCaptionEntries={setCaptionEntries}
					setIsCreatingCaptions={setIsCreatingCaptions}
				/>
			) : captionEntries ? (
				<CaptionsView captionEntries={captionEntries} autoScroll={autoScroll} />
			) : null}
			<div className="flex gap-2 items-stretch">
				<SelectWrapper
					className="select"
					value={language1}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLanguage1(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<SelectWrapper
					className="select"
					value={language2}
					options={[undefined, ...captionTracks]}
					onChange={(e) => setLanguage2(e)}
					labelFn={(e) => (e ? captionTrackName(e) : "-- select --")}
				/>
				<details className="dropdown dropdown-top dropdown-end">
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
						<li>
							<span className="flex items-center gap-2.5">
								<span className="flex-1">Resize</span>
								<span
									className="icon-[ri--subtract-line]"
									onClick={() => {
										rpc.resizeUI(-20);
									}}
								></span>
								<span
									className="icon-[ri--add-line]"
									onClick={() => {
										rpc.resizeUI(+20);
									}}
								></span>
							</span>
						</li>
						<li
							onClick={async () => {
								if (!captionEntries || !language1 || !language2) return;
								let result = "";
								result += `| ${captionTrackName(language1)} | ${captionTrackName(language2)} |\n`;
								result += `| --- | --- |\n`;
								for (const e of captionEntries) {
									result += `| `;
									result += [e.text1, e.text2]
										.map((t) => t.replace(/\|/g, "_").replace(/\s/g, " "))
										.join(" | ");
									result += ` |\n`;
								}
								await rpc.writeToClipboard(result);
							}}
						>
							<span className="flex items-center">
								<span className="flex-1">Copy</span>
							</span>
						</li>
						<li
							onClick={async () => {
								setIsCreatingCaptions(true);
								setLanguage1(undefined);
								setLanguage2(undefined);
								setCaptionEntries([]);
								await videoStorage.setValue({ lastSelected: undefined });
							}}
						>
							<span>Create captions</span>
						</li>
						{captionEntries && captionEntries.length > 0 && (
							<li
								onClick={() => {
									setIsCreatingCaptions(true);
								}}
							>
								<span>Edit captions</span>
							</li>
						)}
						<li
							onClick={async () => {
								setLanguage1(undefined);
								setLanguage2(undefined);
								setCaptionEntries([]);
								await videoStorage.setValue({ lastSelected: undefined });
							}}
						>
							<span>Reset</span>
						</li>
					</ul>
				</details>
			</div>
		</div>
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

	const isManualScroll = React.useRef(false);
	const setDebouncedTimeout = useDebouncedTimeout();

	// auto scroll to current entry
	React.useEffect(() => {
		if (!autoScroll || !currentEntry || isManualScroll.current) return;
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
		if (Math.abs(current - 0.5) < 0.3) return;

		element.scrollIntoView({
			block: "center",
			inline: "center",
			behavior: "smooth",
		});
	}, [currentEntry, autoScroll]);

	const [loopEntry, setLoopEntry] = React.useState<CaptionEntry>();

	React.useEffect(() => {
		if (loopEntry && currentEntry !== loopEntry) {
			rpc.seek(loopEntry.begin);
		}
	}, [loopEntry, state.time]);

	return (
		<div
			className="flex flex-col gap-2 text-sm overflow-y-auto"
			onWheel={() => {
				isManualScroll.current = true;
				setDebouncedTimeout(() => {
					isManualScroll.current = false;
				}, 2000);
			}}
		>
			{captionEntries.map((e) => (
				<CaptionEntryView
					key={e.index}
					entry={e}
					isCurrent={e === currentEntry}
					isPlaying={state.playing}
					isLooping={e === loopEntry}
					setLoopEntry={setLoopEntry}
					isEditing={false}
				/>
			))}
		</div>
	);
}

function useDebouncedTimeout() {
	const ref = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	return (callback: () => void, timeoutMs: number) => {
		if (ref.current !== null) {
			clearTimeout(ref.current);
		}
		ref.current = setTimeout(() => {
			callback();
			ref.current = null;
		}, timeoutMs);
	};
}

function CaptionEntryView(props: {
	entry: CaptionEntry;
	isCurrent: boolean;
	isPlaying: boolean;
	isLooping: boolean;
	setLoopEntry: (e?: CaptionEntry) => void;
	setCaptionEntries?: (entries: CaptionEntry[]) => void;
	captionEntries?: CaptionEntry[];
	isEditing?: boolean;
}) {
	const isInlineEditing =
		props.isEditing && props.setCaptionEntries && props.captionEntries;

	function updateEntry(updates: Partial<CaptionEntry>) {
		if (!props.setCaptionEntries || !props.captionEntries) return;

		const updatedEntries = props.captionEntries.map((entry, i) =>
			i === props.entry.index ? { ...entry, ...updates } : entry,
		);
		props.setCaptionEntries(updatedEntries);

		// Update storage
		videoStorage.setValue({
			lastSelected: {
				language1: {
					vssId: "custom-1",
					languageCode: "custom-1",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 1" }] },
				},
				language2: {
					vssId: "custom-2",
					languageCode: "custom-2",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 2" }] },
				},
				captionEntries: updatedEntries,
			},
		});
	}

	function insertEntry(side: 1 | 2) {
		if (!props.setCaptionEntries || !props.captionEntries) return;

		const newEntry: CaptionEntry = {
			index: props.captionEntries.length,
			begin: props.entry.end,
			end: props.entry.end + 3,
			text1: side === 1 ? "" : props.entry.text1,
			text2: side === 2 ? "" : props.entry.text2,
			endLocked: false,
		};

		const updatedEntries = [
			...props.captionEntries.slice(0, props.entry.index + 1),
			newEntry,
			...props.captionEntries.slice(props.entry.index + 1),
		].map((entry, index) => ({ ...entry, index }));

		props.setCaptionEntries(updatedEntries);

		// Update storage
		videoStorage.setValue({
			lastSelected: {
				language1: {
					vssId: "custom-1",
					languageCode: "custom-1",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 1" }] },
				},
				language2: {
					vssId: "custom-2",
					languageCode: "custom-2",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 2" }] },
				},
				captionEntries: updatedEntries,
			},
		});
	}

	function deleteEntry() {
		if (!props.setCaptionEntries || !props.captionEntries) return;

		const updatedEntries = props.captionEntries
			.filter((_, i) => i !== props.entry.index)
			.map((entry, index) => ({ ...entry, index }));

		props.setCaptionEntries(updatedEntries);

		// Update storage
		videoStorage.setValue({
			lastSelected: {
				language1: {
					vssId: "custom-1",
					languageCode: "custom-1",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 1" }] },
				},
				language2: {
					vssId: "custom-2",
					languageCode: "custom-2",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 2" }] },
				},
				captionEntries: updatedEntries,
			},
		});
	}

	if (isInlineEditing) {
		return (
			<div
				data-entry-index={props.entry.index}
				className={cls(
					"flex flex-col gap-1 p-1.5 rounded-md border-1 transition",
					props.isCurrent
						? props.isPlaying
							? "bg-blue-100 border-blue-300 ring-2 ring-blue-200"
							: "bg-green-100 border-green-300"
						: "bg-gray-50 border-gray-300",
				)}
			>
				{/* Timing Controls */}
				<div className="text-xs flex items-center gap-2 px-0.5">
					<button
						className="icon-[ri--play-circle-line] w-4 h-4 text-gray-500 hover:text-gray-700 cursor-pointer"
						onClick={() => rpc.seek(props.entry.begin)}
					/>
					<div className="flex items-center gap-1">
						<button
							className="icon-[ri--time-line] w-3.5 h-3.5 text-gray-500 hover:text-gray-700 cursor-pointer"
							onClick={async () => {
								if (!props.setCaptionEntries || !props.captionEntries) return;

								const state = await rpc.getVideoState();

								// Update both current entry's begin and previous entry's end in one operation
								const updatedEntries = props.captionEntries.map((entry, i) => {
									if (i === props.entry.index) {
										// Update current entry's begin time
										return { ...entry, begin: state.time };
									} else if (i === props.entry.index - 1 && !entry.endLocked) {
										// Auto-align previous entry's end time (only if not locked)
										return { ...entry, end: state.time };
									}
									return entry;
								});

								props.setCaptionEntries(updatedEntries);

								// Update storage
								videoStorage.setValue({
									lastSelected: {
										language1: {
											vssId: "custom-1",
											languageCode: "custom-1",
											baseUrl: "",
											name: { runs: [{ text: "Custom Language 1" }] },
										},
										language2: {
											vssId: "custom-2",
											languageCode: "custom-2",
											baseUrl: "",
											name: { runs: [{ text: "Custom Language 2" }] },
										},
										captionEntries: updatedEntries,
									},
								});
							}}
						/>
						<span className="text-gray-600 min-w-[4rem]">
							{stringifyTimestamp(props.entry.begin)}
						</span>
					</div>
					<span className="text-gray-400">-</span>
					<div className="flex items-center gap-1">
						<button
							className="icon-[ri--time-line] w-3.5 h-3.5 text-gray-500 hover:text-gray-700 cursor-pointer"
							disabled={props.entry.endLocked}
							onClick={async () => {
								const state = await rpc.getVideoState();
								updateEntry({ end: state.time });
							}}
						/>
						<span className="text-gray-600 min-w-[4rem]">
							{stringifyTimestamp(props.entry.end)}
						</span>
						<button
							className={cls(
								"w-3 h-3 cursor-pointer",
								props.entry.endLocked
									? "icon-[ri--lock-password-line] text-red-600"
									: "icon-[ri--lock-unlock-line] text-gray-500 hover:text-gray-700",
							)}
							onClick={() => {
								updateEntry({ endLocked: !props.entry.endLocked });
							}}
						/>
					</div>
					<div className="flex-1" />
					<span className="flex items-center gap-1">
						<a
							href={
								`chrome-extension://${browser.runtime.id}/typing.html?text=` +
								encodeURIComponent(props.entry.text1)
							}
							className="icon-[ri--keyboard-line] w-4 h-4 text-gray-500 hover:text-gray-700"
							target="_blank"
							onClick={(e) => e.stopPropagation()}
						/>
						<span
							className={cls(
								"icon-[ri--repeat-line] w-3.5 h-3.5 cursor-pointer",
								props.isLooping
									? "text-blue-700"
									: "text-gray-500 hover:text-gray-700",
							)}
							onClick={() =>
								props.setLoopEntry(props.isLooping ? undefined : props.entry)
							}
						/>
						<button
							className="icon-[ri--delete-bin-line] w-3.5 h-3.5 text-red-500 hover:text-red-700 cursor-pointer"
							onClick={deleteEntry}
						/>
					</span>
				</div>

				{/* Text Areas */}
				<div className="flex gap-1">
					<textarea
						className="flex-1 p-1 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
						rows={2}
						value={props.entry.text1}
						onChange={(e) => updateEntry({ text1: e.target.value })}
						onKeyDown={(e) => {
							if (e.ctrlKey && e.key === "Enter") {
								e.preventDefault();
								insertEntry(1);
							}
							if (e.ctrlKey && e.key === "d") {
								e.preventDefault();
								deleteEntry();
							}
						}}
						placeholder="Language 1 text..."
					/>
					<textarea
						className="flex-1 p-1 text-sm border border-gray-300 rounded resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
						rows={2}
						value={props.entry.text2}
						onChange={(e) => updateEntry({ text2: e.target.value })}
						onKeyDown={(e) => {
							if (e.ctrlKey && e.key === "Enter") {
								e.preventDefault();
								insertEntry(2);
							}
							if (e.ctrlKey && e.key === "d") {
								e.preventDefault();
								deleteEntry();
							}
						}}
						placeholder="Language 2 text..."
					/>
				</div>
			</div>
		);
	}

	// Regular viewing mode
	return (
		<div
			data-entry-index={props.entry.index}
			className={cls(
				"flex flex-col gap-1 p-1.5 rounded-md border-1 cursor-pointer transition",
				props.isCurrent
					? props.isPlaying
						? "bg-blue-100 hover:bg-blue-200 border-blue-300"
						: "bg-green-100 hover:bg-green-200 border-green-300"
					: "bg-gray-100 hover:bg-gray-200 border-gray-300",
			)}
			onClick={async () => {
				const selection = window.getSelection();
				if (!selection || !selection.isCollapsed) return;

				if (props.isCurrent) {
					await rpc.togglePlay();
				} else {
					props.setLoopEntry(undefined);
					await rpc.seek(props.entry.begin);
				}
			}}
		>
			<div className="text-xs flex items-center px-0.5">
				<span className="flex-1 text-gray-500">
					{stringifyTimestamp(props.entry.begin)} -{" "}
					{stringifyTimestamp(props.entry.end)}
				</span>
				<span className="flex items-center gap-1.5">
					<a
						href={
							`chrome-extension://${browser.runtime.id}/typing.html?text=` +
							encodeURIComponent(props.entry.text1)
						}
						className="icon-[ri--keyboard-line] w-4 h-4 text-gray-500 hover:text-gray-700"
						target="_blank"
						onClick={(e) => {
							e.stopPropagation();
						}}
					/>
					<span
						className={cls(
							"icon-[ri--repeat-line] w-3.5 h-3.5 cursor-pointer",
							props.isLooping
								? "text-blue-700 scale-110"
								: "text-gray-500 hover:text-gray-700 hover:scale-110",
						)}
						onClick={(e) => {
							e.stopPropagation();
							props.setLoopEntry(props.isLooping ? undefined : props.entry);
						}}
					></span>
					<span
						className={cls(
							"icon-[ri--play-circle-line] w-3.5 h-3.5 cursor-pointer text-gray-500 hover:text-gray-700 hover:scale-110",
						)}
						onClick={async (e) => {
							e.stopPropagation();
							await rpc.seek(props.entry.begin);
						}}
					></span>
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

function CaptionCreatorView({
	captionEntries,
	setCaptionEntries,
	setIsCreatingCaptions,
}: {
	captionEntries: CaptionEntry[];
	setCaptionEntries: (entries: CaptionEntry[]) => void;
	setIsCreatingCaptions: (creating: boolean) => void;
}) {
	const query = useQuery({
		queryKey: ["getState"],
		queryFn: async () => rpc.getVideoState(),
		initialData: { playing: false, time: 0 },
		refetchInterval: 200,
	});

	const [bulkImportText, setBulkImportText] = React.useState("");
	const [showBulkImport, setShowBulkImport] = React.useState(false);
	const [loopEntry, setLoopEntry] = React.useState<CaptionEntry>();

	const currentEntry = React.useMemo(
		() => findCurrentEntry(captionEntries, query.data.time),
		[captionEntries, query.data.time],
	);

	React.useEffect(() => {
		if (loopEntry && currentEntry !== loopEntry) {
			rpc.seek(loopEntry.begin);
		}
	}, [loopEntry, query.data.time]);

	function addNewEntry() {
		const currentTime = query.data.time;
		const newEntry: CaptionEntry = {
			index: captionEntries.length,
			begin: currentTime,
			end: currentTime + 3,
			text1: "",
			text2: "",
			endLocked: false,
		};

		const updatedEntries = [...captionEntries, newEntry]
			.sort((a, b) => a.begin - b.begin)
			.map((entry, index) => ({ ...entry, index }));

		setCaptionEntries(updatedEntries);
		videoStorage.setValue({
			lastSelected: {
				language1: {
					vssId: "custom-1",
					languageCode: "custom-1",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 1" }] },
				},
				language2: {
					vssId: "custom-2",
					languageCode: "custom-2",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 2" }] },
				},
				captionEntries: updatedEntries,
			},
		});
	}

	function exportCaptions(format: "srt" | "vtt" | "json") {
		let content = "";

		if (format === "srt") {
			captionEntries.forEach((entry, i) => {
				const startTime = formatSRTTime(entry.begin);
				const endTime = formatSRTTime(entry.end);
				content += `${i + 1}\n${startTime} --> ${endTime}\n${entry.text1}\n${entry.text2}\n\n`;
			});
		} else if (format === "vtt") {
			content = "WEBVTT\n\n";
			captionEntries.forEach((entry) => {
				const startTime = formatVTTTime(entry.begin);
				const endTime = formatVTTTime(entry.end);
				content += `${startTime} --> ${endTime}\n${entry.text1}\n${entry.text2}\n\n`;
			});
		} else if (format === "json") {
			content = JSON.stringify(captionEntries, null, 2);
		}

		const blob = new Blob([content], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `captions.${format}`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function formatSRTTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 1000);
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
	}

	function formatVTTTime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = (seconds % 60).toFixed(3);
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.padStart(6, "0")}`;
	}

	function parseMarkdownTable(
		text: string,
	): { text1: string; text2: string }[] {
		const lines = text.trim().split("\n");
		const entries: { text1: string; text2: string }[] = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]?.trim();

			// Skip header row, separator row, and empty lines
			if (line && line.startsWith("|") && !line.includes("---") && i > 0) {
				const cells = line
					.split("|")
					.map((cell) => cell.trim())
					.filter((cell) => cell !== ""); // Remove empty cells from start/end

				if (cells.length >= 2) {
					entries.push({
						text1: cells[0] || "",
						text2: cells[1] || "",
					});
				}
			}
		}

		return entries;
	}

	function bulkImportCaptions() {
		const parsedEntries = parseMarkdownTable(bulkImportText);
		if (parsedEntries.length === 0) return;

		const currentTime = query.data.time;
		const defaultDuration = 3; // 3 seconds per caption

		const newCaptionEntries: CaptionEntry[] = parsedEntries.map(
			(entry, index) => ({
				index: captionEntries.length + index,
				begin: currentTime + index * defaultDuration,
				end: currentTime + (index + 1) * defaultDuration,
				text1: entry.text1,
				text2: entry.text2,
				endLocked: true, // Lock imported entries by default
			}),
		);

		const allEntries = [...captionEntries, ...newCaptionEntries]
			.sort((a, b) => a.begin - b.begin)
			.map((entry, index) => ({ ...entry, index }));

		setCaptionEntries(allEntries);
		videoStorage.setValue({
			lastSelected: {
				language1: {
					vssId: "custom-1",
					languageCode: "custom-1",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 1" }] },
				},
				language2: {
					vssId: "custom-2",
					languageCode: "custom-2",
					baseUrl: "",
					name: { runs: [{ text: "Custom Language 2" }] },
				},
				captionEntries: allEntries,
			},
		});

		setBulkImportText("");
		setShowBulkImport(false);
	}

	return (
		<div className="flex flex-col gap-2 h-full">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-sm">Caption Editor</h3>
				<div className="flex gap-1">
					<button
						className="btn btn-xs"
						onClick={() => setShowBulkImport(!showBulkImport)}
					>
						Bulk Import
					</button>
					<button className="btn btn-xs btn-primary" onClick={addNewEntry}>
						Add Entry
					</button>
					{captionEntries.length > 0 && (
						<>
							<button
								className="btn btn-xs"
								onClick={() => exportCaptions("srt")}
							>
								Export SRT
							</button>
							<button
								className="btn btn-xs"
								onClick={() => exportCaptions("vtt")}
							>
								Export VTT
							</button>
						</>
					)}
					<button
						className="btn btn-xs btn-primary"
						onClick={() => setIsCreatingCaptions(false)}
					>
						← Back to View
					</button>
				</div>
			</div>

			{/* Bulk Import */}
			{showBulkImport && (
				<div className="bg-blue-50 p-3 rounded border">
					<div className="mb-2">
						<label className="text-sm font-medium text-gray-700 mb-1 block">
							Bulk Import from Markdown Table
						</label>
						<p className="text-xs text-gray-600 mb-2">
							Paste a markdown table with dual-language text. Each row will
							become a caption entry with auto-generated timing (3 seconds
							each).
						</p>
						<textarea
							className="textarea textarea-sm w-full resize-none"
							rows={6}
							value={bulkImportText}
							onChange={(e) => setBulkImportText(e.target.value)}
							placeholder={`| 한국어 | 영어 |
|--------|------|
| 시간이 멈춘 기찻길 | The train tracks where time stopped |
| 하얀 풀꽃들 사이 | Among the white wildflowers |
| 바스락대던 너의 발소리 | The rustling sound of your footsteps |`}
						/>
					</div>
					<div className="flex gap-2">
						<button
							className="btn btn-sm btn-primary flex-1"
							onClick={bulkImportCaptions}
							disabled={!bulkImportText.trim()}
						>
							Import {parseMarkdownTable(bulkImportText).length} Entries
						</button>
						<button
							className="btn btn-sm"
							onClick={() => setShowBulkImport(false)}
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{/* Help Text */}
			<div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-4">
						<span>
							<kbd className="kbd kbd-xs">Ctrl+Enter</kbd> Add new entry
						</span>
						<span>
							<kbd className="kbd kbd-xs">Ctrl+D</kbd> Delete entry
						</span>
					</div>
					<div className="text-xs text-gray-500">
						💡 Click start time (⏰) to set current video time. Previous entry's
						end time auto-aligns (unless locked 🔒).
					</div>
				</div>
			</div>

			{/* Caption Entries */}
			<div className="flex flex-col gap-2 overflow-y-auto flex-1">
				{captionEntries.length === 0 ? (
					<div className="text-center text-gray-500 py-8">
						<p>No caption entries yet.</p>
						<p className="text-xs">
							Click "Add Entry" or "Bulk Import" to get started.
						</p>
					</div>
				) : (
					captionEntries.map((entry) => (
						<CaptionEntryView
							key={entry.index}
							entry={entry}
							isCurrent={entry === currentEntry}
							isPlaying={query.data.playing}
							isLooping={entry === loopEntry}
							setLoopEntry={setLoopEntry}
							setCaptionEntries={setCaptionEntries}
							captionEntries={captionEntries}
							isEditing={true}
						/>
					))
				)}
			</div>
		</div>
	);
}
