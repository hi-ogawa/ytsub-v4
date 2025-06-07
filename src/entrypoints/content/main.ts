import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { fetchMetadataJson } from "../../utils";
import { onMessage } from "./rpc";
import { tinyassert } from "@hiogawa/utils";

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
	const ui = createIframeUi(ctx, {
		page: "content-iframe.html",
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

			const channel = new MessageChannel();
			// exposeTinyRpc({
			// 	routes: new RpcHandler(),
			// 	adapter: messagePortServerAdapter({
			// 		port: channel.port1,
			// 	}),
			// });
			channel.port1.start();
			tinyassert(iframe.contentWindow);
			iframe.contentWindow!.postMessage("init-rpc", "*", [channel.port2]);
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

	onMessage("fetchMetadata", async ({ data: { videoId } }) => {
		return fetchMetadataJson(videoId);
	});
	onMessage("play", ({ data }) => service.play(data));
}
