import { fetchMetadataJson } from "../../utils";
import { onMessage } from "./rpc";

async function main() {
	console.log("Hello content.");

	onMessage("fetchMetadata", async ({ data: { videoId } }) => {
		return fetchMetadataJson(videoId);
	});
}

main();
