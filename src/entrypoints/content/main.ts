import { fetchMetadataJson } from "../../utils";
import { onMessage } from "./rpc";

class Service {
	get video() {
		return document.querySelector<HTMLVideoElement>("video.html5-main-video")!;
	}

	play(time: number) {
		this.video.currentTime = time;
		setTimeout(() => this.video.play());
	}
}

async function main() {
	const service = new Service();

	onMessage("fetchMetadata", async ({ data: { videoId } }) => {
		return fetchMetadataJson(videoId);
	});
	onMessage("play", ({ data }) => service.play(data));
}

main();
