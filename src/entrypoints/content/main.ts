import { browser } from "wxt/browser";
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

	// Add iframe support for API access from extension page
	async handleIframeApiRequest(request: any) {
		try {
			switch (request.action) {
				case "fetchMetadata":
					return await this.fetchMetadata(request.videoId);
				case "fetchCaptionEntries":
					// TODO: Implement caption fetching
					return {
						success: true,
						message: "Caption fetching not implemented yet",
					};
				default:
					throw new Error(`Unknown action: ${request.action}`);
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			};
		}
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

	async writeToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
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

	// Add iframe-specific message handling for extension page communication
	if (window !== window.top) {
		// We're in an iframe - set up communication with extension pages directly
		console.log("Content script running in iframe context");

		// Listen for messages from extension pages via browser.tabs.sendMessage
		browser.runtime.onMessage.addListener(
			async (message, sender, sendResponse) => {
				console.log(
					"Iframe content script received message:",
					message,
					"from:",
					sender,
				);

				if (message.type === "YOUTUBE_API_REQUEST") {
					console.log("Processing API request in iframe:", message);

					try {
						const result = await service.handleIframeApiRequest({
							action: message.action,
							videoId: message.videoId,
						});

						// Send response back to extension page
						browser.runtime.sendMessage({
							type: "YOUTUBE_API_RESPONSE",
							requestId: message.requestId,
							success: true,
							data: result,
						});

						sendResponse({ processed: true });
					} catch (error) {
						// Send error response back to extension page
						browser.runtime.sendMessage({
							type: "YOUTUBE_API_RESPONSE",
							requestId: message.requestId,
							success: false,
							error: error instanceof Error ? error.message : "Unknown error",
						});

						sendResponse({
							processed: false,
							error: error instanceof Error ? error.message : "Unknown error",
						});
					}

					return true; // Keep the message channel open for async response
				}
			},
		);

		// Signal to extension pages that iframe content script is ready
		setTimeout(() => {
			browser.runtime.sendMessage({
				type: "IFRAME_CONTENT_SCRIPT_READY",
				origin: window.location.origin,
				frameUrl: window.location.href,
			});
		}, 2000); // Wait a bit longer for iframe to fully load
	}
}
