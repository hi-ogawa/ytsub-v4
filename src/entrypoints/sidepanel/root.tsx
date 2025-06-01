import React from "react";
import { browser } from "wxt/browser";
import {
	type CaptionEntry,
	type CaptionTrackMetadata,
	fetchCaptionEntries,
	parseVideoId,
	stringifyTimestamp,
	type VideoMetadata,
} from "../../utils";
import { sendMessage } from "../content/rpc";

// TODO:
// - settings
//   - default language pair
// - storage
//   - cache last loaded subtitles
// - monitor active tab video
//   - refresh
//   - disable when not
// - fetch metadata
// - subtitles UI
// - abstract service interface (context/provider?)

export function Root() {
	const [metadata, setMetadata] = React.useState<VideoMetadata>();

	return (
		<div>
			<div>
				<button
					onClick={async () => {
						const metadata = await getVideoMetadata();
						setMetadata(metadata);
					}}
				>
					{metadata ? "Refresh" : "Load"}
				</button>
			</div>
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
		return <div>No captions available :(</div>;
	}

	return (
		<div>
			<SelectWrapper
				value={lang1}
				options={captionTracks}
				onChange={(e) => setLang1(e)}
				labelFn={(e) => e?.vssId}
			/>
			<SelectWrapper
				value={lang2}
				options={captionTracks}
				onChange={(e) => setLang2(e)}
				labelFn={(e) => e?.vssId}
			/>
			{lang1 && lang2 && (
				<div>
					<button
						onClick={async () => {
							const result = await fetchCaptionEntries({
								language1: lang1,
								language2: lang2,
							});
							setCaptionEntries(result);
						}}
					>
						Load captions
					</button>
				</div>
			)}
			{captionEntries && <CaptionsView captionEntries={captionEntries} />}
		</div>
	);
}

function CaptionsView(props: { captionEntries: CaptionEntry[] }) {
	return (
		<div>
			<div>
				{props.captionEntries.map((e) => (
					<div
						key={e.index}
						style={{
							border: "1px solid #0004",
							margin: "0.5rem",
							padding: "0.2rem",
						}}
					>
						<div
							style={{ marginBottom: "0.1rem", display: "flex", gap: "0.5rem" }}
						>
							<span>
								{stringifyTimestamp(e.begin)} - {stringifyTimestamp(e.end)}
							</span>
							<button
								style={{ fontSize: "0.5rem" }}
								onClick={async () => {
									const tabs = await browser.tabs.query({
										active: true,
										currentWindow: true,
									});
									const tabId = tabs[0]!.id!;
									await sendMessage("seek", e.begin, { tabId });
									await sendMessage("play", undefined, { tabId });
								}}
							>
								▶️
							</button>
						</div>
						<div style={{ display: "flex" }}>
							<div style={{ flex: 1 }}>{e.text1}</div>
							<div style={{ flex: 1 }}>{e.text2}</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function SelectWrapper<T>({
	value,
	options,
	onChange,
	// convenient default when `T extends string`
	labelFn = String,
	keyFn = (value) => JSON.stringify({ value }), // wrap it so that `undefined` becomes `{}`
	...selectProps
}: {
	value: T;
	options: readonly T[];
	onChange: (value: T) => void;
	labelFn?: (value: T) => React.ReactNode;
	keyFn?: (value: T) => React.Key;
} & Omit<React.JSX.IntrinsicElements["select"], "value" | "onChange">) {
	return (
		<select
			value={options.indexOf(value)}
			onChange={(e) => onChange(options[Number(e.target.value)]!)}
			{...selectProps}
		>
			{options.map((option, i) => (
				<option key={keyFn(option)} value={i}>
					{labelFn(option)}
				</option>
			))}
		</select>
	);
}

// TODO: monitor active tab
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
