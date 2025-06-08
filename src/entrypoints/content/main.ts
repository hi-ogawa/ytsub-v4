import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { fetchMetadataJson, parseVideoId } from "../../utils";
import { sendMessage } from "../background/rpc";
import { onMessage, registerContentService, updateContentState } from "./rpc";

export type ContentState = ReturnType<ContentService["getContentState"]>;

export class ContentService {
	ui?: ReturnType<typeof createIframeUi>;

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
			this.updateContentState();
		});
	}

	fetchMetadata(videoId: string) {
		return fetchMetadataJson(videoId);
	}

	getContentState() {
		return {
			videoId: parseVideoId(window.location.href),
			ui: !!this.ui,
		};
	}

	updateContentState() {
		updateContentState(this.tabId, this.getContentState());
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

	seek(time: number) {
		const video = this.getVideo();
		if (video) {
			video.currentTime = time;
		}
	}

	showUI() {
		if (this.ui) return;
		const video = this.getVideo();
		const { videoId } = this.getContentState();
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
		this.updateContentState();
	}

	hideUI() {
		if (!this.ui) return;
		this.ui.remove();
		this.ui = undefined;
		this.updateContentState();
	}
}

export async function main(ctx: ContentScriptContext) {
	const { tabId } = await sendMessage("initContent", undefined);

	const service = new ContentService(ctx, tabId);
	registerContentService(service);

	onMessage("show", () => {
		service.showUI();
	});

	onMessage("hide", () => {
		service.hideUI();
	});

	onMessage("getState", () => {
		const { ui: mounted } = service.getContentState();
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

	onMessage("play", (e) => service.seek(e.data));
}
