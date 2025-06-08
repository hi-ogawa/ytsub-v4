import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { fetchMetadataJson, parseVideoId } from "../../utils";
import { sendMessage } from "../background/rpc";
import { onMessage } from "./rpc";

export class ContentService {
	ui?: ReturnType<typeof createIframeUi>;

	constructor(
		private ctx: ContentScriptContext,
		private tabId: number,
	) {
		this.ctx.addEventListener(window, "wxt:locationchange", (e) => {
			const lastVideoId = parseVideoId(e.oldUrl.href);
			const newVideoId = parseVideoId(e.newUrl.href);
			if (lastVideoId !== newVideoId) {
				this.hideUI();
			}
		});
	}

	fetchMetadata(videoId: string) {
		return fetchMetadataJson(videoId);
	}

	getPageState() {
		return {
			videoId: parseVideoId(window.location.href),
			mounted: !!this.ui,
		};
	}

	getVideo() {
		return document.querySelector<HTMLVideoElement>("video.html5-main-video");
	}

	getVideoState() {
		const video = this.getVideo();
		return {
			playing: video?.paused ?? false,
			time: video?.currentTime ?? 0,
			loop: video?.loop ?? false,
		};
	}

	playVideoAt(time: number) {
		const video = this.getVideo();
		if (video) {
			video.currentTime = time;
			setTimeout(() => video.play());
		}
	}

	showUI() {
		const video = this.getVideo();
		const { videoId } = this.getPageState();
		if (!videoId || !video) {
			return;
		}
		video.loop = true;
		this.ui = createIframeUi(this.ctx, {
			page: `content-iframe.html?tabId=${this.tabId}&videoId=${videoId}`,
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
		this.ui.mount();
	}

	hideUI() {
		this.ui?.remove();
		this.ui = undefined;
	}
}

export async function main(ctx: ContentScriptContext) {
	const { tabId } = await sendMessage("initContent", undefined);

	const service = new ContentService(ctx, tabId);

	onMessage("show", () => {
		service.showUI();
	});

	onMessage("hide", () => {
		service.hideUI();
	});

	onMessage("getState", () => {
		const { mounted } = service.getPageState();
		const { playing, time } = service.getVideoState();
		return {
			mounted,
			playing,
			time,
		};
	});

	onMessage("fetchMetadata", async (e) => {
		return service.fetchMetadata(e.data);
	});

	onMessage("play", (e) => service.playVideoAt(e.data));
}
