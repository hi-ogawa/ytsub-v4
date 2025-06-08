import "../../styles.css";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { fetchMetadataJson, parseVideoId } from "../../utils";
import { sendMessage } from "../background/rpc";
import { onMessage } from "./rpc";
import ReactDomClient from "react-dom/client";
import { Root } from "./root";

export async function main(ctx: ContentScriptContext) {
	// TODO: check location and auto close on navigation
	// https://github.com/wxt-dev/wxt/issues/1567
	// ctx.addEventListener(window, "wxt:locationchange", () => {});

	const ui2 = await createShadowRootUi(ctx, {
		name: "ytsub-ui",
		position: "inline",
		anchor: "body",
		// onMount(container, _shadow, shadowHost) {
		// 	shadowHost.style.position = "fixed";
		// 	shadowHost.style.zIndex = "100000";
		// 	shadowHost.style.right = "10px";
		// 	shadowHost.style.bottom = "10px";

		// 	const app = document.createElement('p');
		// 	app.textContent = 'Hello world!';
		// 	container.append(app);
		// 	container.style.background = "white";
		// },
		onMount: (container, _shadow, shadowHost) => {
			shadowHost.style.position = "fixed";
			shadowHost.style.zIndex = "100000";
			shadowHost.style.right = "10px";
			shadowHost.style.bottom = "10px";

			const root = ReactDomClient.createRoot(container);
			root.render(<Root />);
			return { root };
		},
		onRemove: (elements) => {
			elements?.root.unmount();
		},
	});
	ui2.mount();

	const videoId = parseVideoId(window.location.href);
	if (!videoId) return;

	const { tabId } = await sendMessage("initContent", undefined);

	const ui = createIframeUi(ctx, {
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
		const video = service.getVideo();
		return {
			mounted,
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

	onMessage("fetchMetadata", () => fetchMetadataJson(videoId));
	onMessage("play", ({ data }) => service.play(data));
}
