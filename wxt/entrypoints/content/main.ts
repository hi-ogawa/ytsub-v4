import { fetchMetadataJson } from "../../utils";

async function main() {
	console.log("Hello content.");

	// https://www.youtube.com/watch?v=3k9T9EnbLmw&list=LL&index=74&t=107s
	const metadata = await fetchMetadataJson("3k9T9EnbLmw");
	console.log(
		"[🔥🔥🔥🔥🔥🔥 fetchMetadataJson]",
		metadata.captions?.playerCaptionsTracklistRenderer.captionTracks,
	);
}

main();
