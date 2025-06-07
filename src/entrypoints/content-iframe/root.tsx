import React from "react";
import { browser } from "wxt/browser";
import { SelectWrapper } from "../../ui";
import {
	type CaptionEntry,
	type CaptionTrackMetadata,
	captionTrackName,
	fetchCaptionEntries,
	parseVideoId,
	stringifyTimestamp,
	type VideoMetadata,
} from "../../utils";
import { sendMessage } from "../content/rpc";

export function Root() {
	const [metadata, setMetadata] = React.useState<VideoMetadata>();

	return (
		<div className="p-2 flex flex-col gap-2">
			<button
				className="btn btn-sm"
				onClick={async () => {
					const metadata = await getVideoMetadata();
					setMetadata(metadata);
				}}
			>
				{metadata ? "Refresh" : "Load"}
			</button>
			{metadata && <MainView metadata={metadata} />}
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
			<div className="flex gap-2">
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
			</div>
			{lang1 && lang2 && (
				<button
					className="btn btn-sm"
					onClick={async () => {
						const result = await fetchCaptionEntries({
							language1: lang1,
							language2: lang2,
						});
						setCaptionEntries(result);
					}}
				>
					Load Captions
				</button>
			)}
			{captionEntries && <CaptionsView captionEntries={captionEntries} />}
		</>
	);
}

function CaptionsView(props: { captionEntries: CaptionEntry[] }) {
	// TODO: highlight currently playing entry

	return (
		<div className="flex flex-col gap-2 text-sm">
			{props.captionEntries.map((e) => (
				<div
					key={e.index}
					className="flex flex-col gap-1 p-2 rounded-md bg-gray-100 hover:bg-gray-200 border-1 border-gray-300 cursor-pointer"
					onClick={async () => {
						const tabs = await browser.tabs.query({
							active: true,
							currentWindow: true,
						});
						const tabId = tabs[0]!.id!;
						await sendMessage("play", e.begin, { tabId });
					}}
				>
					<div
						style={{ marginBottom: "0.1rem", display: "flex", gap: "0.5rem" }}
					>
						<span>
							{stringifyTimestamp(e.begin)} - {stringifyTimestamp(e.end)}
						</span>
					</div>
					<div style={{ display: "flex" }}>
						<div style={{ flex: 1 }}>{e.text1}</div>
						<div style={{ flex: 1 }}>{e.text2}</div>
					</div>
				</div>
			))}
		</div>
	);
}

async function getVideoMetadata(): Promise<VideoMetadata | undefined> {
	const tabs = await browser.tabs.query({
		active: true,
		currentWindow: true,
	});
	const tab = tabs[0];
	console.log({ tab });
	if (tab && tab.url && tab.id) {
		const videoId = parseVideoId(tab.url);
		console.log({ videoId });
		if (videoId) {
			const result = await sendMessage(
				"fetchMetadata",
				{ videoId },
				{ tabId: tab.id },
			);
			console.log({ result });
			return result;
		}
	}
}
