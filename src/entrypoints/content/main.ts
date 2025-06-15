import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { createRpcClient, registerRpcHandler } from "../../utils/rpc";
import { fetchMetadataJson, parseVideoId } from "../../utils/youtube";
import type { BackgroundService } from "../background/main";

export class ContentService {
	ui?: ReturnType<typeof createIframeUi>;
	controlUI: ReturnType<typeof createIframeUi>;

	constructor(
		public ctx: ContentScriptContext,
		public tabId: number,
	) {
		this.ctx.addEventListener(window, "wxt:locationchange", (e) => {
			const lastVideoId = parseVideoId(e.oldUrl.href);
			const newVideoId = parseVideoId(e.newUrl.href);
			if (lastVideoId !== newVideoId) {
				this.hideUI();
			}
			this.controlUI.wrapper.hidden = !newVideoId;
		});

		// TODO: close UI when full screen mode?
		// setInterval(() => {
		// 	if (document.fullscreenElement) {
		// 		this.controlUI.wrapper.hidden = true;
		// 	}
		// }, 200);

		this.controlUI = createIframeUi(this.ctx, {
			page: `content-iframe.html?tabId=${this.tabId}&control=true`,
			position: "inline",
			anchor: "body",
			onMount: (wrapper, iframe) => {
				wrapper.style.position = "fixed";
				wrapper.style.height = "45px";
				wrapper.style.width = "45px";
				wrapper.style.right = "15px";
				wrapper.style.bottom = "15px";
				wrapper.style.zIndex = "100000";
				iframe.style.width = "100%";
				iframe.style.height = "100%";
				iframe.style.border = "none";
				wrapper.hidden = !this.getPageState().videoId;
			},
		});
		this.controlUI.mount();
	}

	fetchMetadata(videoId: string) {
		return fetchMetadataJson(videoId);
	}

	getPageState() {
		return {
			videoId: parseVideoId(window.location.href),
			ui: !!this.ui,
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
		};
	}

	togglePlay() {
		const video = this.getVideo();
		if (!video) return;
		if (video.paused) {
			video.play();
		} else {
			video.pause();
		}
	}

	seek(time: number) {
		const video = this.getVideo();
		if (!video) return;
		video.currentTime = time;
	}

	async showUI() {
		if (this.ui) return;
		const video = this.getVideo();
		const { videoId } = this.getPageState();
		if (!videoId || !video) {
			return;
		}
		video.loop = true;
		const width = await bgRpc.getUiWidth();
		this.ui = createIframeUi(this.ctx, {
			page: `content-iframe.html?tabId=${this.tabId}&videoId=${videoId}`,
			position: "inline",
			anchor: "body",
			onMount: async (wrapper, iframe) => {
				wrapper.style.position = "fixed";
				wrapper.style.top = "65px";
				wrapper.style.bottom = "65px";
				wrapper.style.right = "10px";
				wrapper.style.width = `${width}px`;
				wrapper.style.zIndex = "100000";
				iframe.style.width = "100%";
				iframe.style.height = "100%";
				iframe.style.border = "none";
			},
		});
		this.ui.mount();
	}

	hideUI() {
		if (!this.ui) return;
		this.ui.remove();
		this.ui = undefined;
	}

	async resizeUI(diff: number) {
		if (!this.ui) return;
		const width = parseInt(this.ui.wrapper.style.width, 10);
		const newWidth = width + diff;
		this.ui.wrapper.style.width = `${newWidth}px`;
		await bgRpc.setUiWidth(newWidth);
	}
}

const tabIdPromise = Promise.withResolvers<number>();

const bgRpc = createRpcClient<BackgroundService>("background-rpc", undefined, {
	onConnect: (tabId) => {
		tabIdPromise.resolve(tabId!);
	},
});

export async function main(ctx: ContentScriptContext) {
	const tabId = await tabIdPromise.promise;
	const service = new ContentService(ctx, tabId);
	registerRpcHandler("content-rpc", service);
}
