import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { fetchMetadataJson, parseVideoId } from "../../utils";
import { sendMessage } from "../background/rpc";
import { onMessage } from "./rpc";

export async function main(ctx: ContentScriptContext) {
	const { tabId } = await sendMessage("initContent", undefined);

	let ui: ReturnType<typeof createIframeUi> | undefined;

	onMessage("show", () => {
		const videoId = parseVideoId(window.location.href);
		ui = createIframeUi(ctx, {
			page: `content-iframe.html?tabId=${tabId}&videoId=${videoId}`,
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
			},
		});
		ui.mount();
	});

	onMessage("hide", () => {
		ui?.remove();
		ui = undefined;
	});

	onMessage("getState", () => {
		const video = service.getVideo();
		return {
			mounted: !!ui,
			playing: video?.paused ?? false,
			time: video?.currentTime ?? 0,
		};
	});

	const service = {
		getVideo() {
			return document.querySelector<HTMLVideoElement>("video.html5-main-video");
		},

		play(time: number) {
			const video = this.getVideo();
			if (!video) return;
			video.currentTime = time;
			setTimeout(() => video.play());
		},
	};

	onMessage("fetchMetadata", async (e) => {
		return fetchMetadataJson(e.data);
	});

	onMessage("play", ({ data }) => service.play(data));
}
