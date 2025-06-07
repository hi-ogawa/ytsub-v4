import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { fetchMetadataJson, parseVideoId } from "../../utils";
import { sendMessage } from "../background/rpc";
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

export async function main(ctx: ContentScriptContext) {
	const videoId = parseVideoId(window.location.href);
	if (!videoId) return;

	const { tabId } = await sendMessage("initContent", undefined);

	const ui = createIframeUi(ctx, {
		page: `content-iframe.html?tabId=${tabId}`,
		position: "inline",
		anchor: "body",
		onMount: (wrapper, iframe) => {
			wrapper.style.position = "fixed";
			wrapper.style.top = "5vh";
			wrapper.style.height = "90vh";
			wrapper.style.right = "10px";
			wrapper.style.width = "480px";
			wrapper.style.zIndex = "100000";
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "none";
			mounted = true;
		},
		onRemove() {
			mounted = false;
		},
	});
	let mounted = false;
	onMessage("show", () => ui.mount());
	onMessage("hide", () => ui.remove());

	onMessage("getState", () => {
		return {
			mounted,
			playing: !service.video.paused,
			time: service.video.currentTime,
		};
	});

	const service = new Service();

	onMessage("fetchMetadata", async () => {
		return fetchMetadataJson(videoId);
	});
	onMessage("play", ({ data }) => service.play(data));
}
