import { fetchMetadataJson } from "../../utils";
import { onMessage } from "./rpc";

class Service {
	get video() {
		return document.querySelector<HTMLVideoElement>("video.html5-main-video")!;
	}

	play() {
		this.video.play();
	}

	pause() {
		this.video.pause();
	}

	seek(time: number) {
		this.video.currentTime = time;
	}
}

async function main() {
	console.log("Hello content.");

	const service = new Service();

	onMessage("fetchMetadata", async ({ data: { videoId } }) => {
		return fetchMetadataJson(videoId);
	});
	onMessage("play", () => service.play());
	onMessage("pause", () => service.pause());
	onMessage("seek", ({ data }) => service.seek(data));
}

main();
