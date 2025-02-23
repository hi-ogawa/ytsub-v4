import { exposeTinyRpc, messagePortServerAdapter } from "@hiogawa/tiny-rpc";
import { tinyassert } from "@hiogawa/utils";
import { fetchMetadataJson } from "../../utils";

export type { RpcHandler };

class RpcHandler {
	constructor() {}

	getMetadata() {
		const url = new URL(window.location.href);
		const videoId = url.searchParams.get("v");
		if (url.pathname === "/watch" && videoId) {
			return fetchMetadataJson(videoId);
		}
		return;
	}

	play() {
		const el = document.querySelector<HTMLVideoElement>(
			"video.html5-main-video",
		)!;
		el.play();
	}

	pause() {
		const el = document.querySelector<HTMLVideoElement>(
			"video.html5-main-video",
		)!;
		el.pause();
	}

	seek() {}
}

function main() {
	// TODO: save and restore position and size
	const wrapper = document.createElement("div");
	wrapper.className = "web-ext-ytsub";
	wrapper.style.cssText = `
		position: absolute;
		z-index: 2020;
		top: 50px;
		right: 50px;
		width: 400px;
		height: 600px;
		background: white;
		border-radius: 6px;
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
		overflow: hidden;
	`;

	// move by dragging top-right corner
	{
		const movableCorner = document.createElement("div");
		movableCorner.style.cssText = `
			position: absolute;
			width: 16px;
			height: 16px;
			background: darkgray;
			top: 0;
			right: 0;
			cursor: grab;
		`;
		movableCorner.draggable = true;
		wrapper.appendChild(movableCorner);

		function move(event: MouseEvent) {
			if (event.clientX === 0 || event.clientY === 0) return;
			const left = event.clientX + movableCorner.clientWidth / 2;
			const top = event.clientY - movableCorner.clientHeight / 2;
			wrapper.style.right = `${document.body.clientWidth - left}px`;
			wrapper.style.top = `${top}px`;
		}
		movableCorner.addEventListener("drag", (event) => move(event));
		movableCorner.addEventListener("dragend", (event) => move(event));
	}

	// resize by dragging bottom-left corner
	{
		const resizeCorner = document.createElement("div");
		resizeCorner.style.cssText = `
			position: absolute;
			width: 15px;
			height: 15px;
			background: darkgray;
			bottom: 0;
			left: 0;
			cursor: nesw-resize;
		`;
		resizeCorner.draggable = true;
		wrapper.appendChild(resizeCorner);

		let startRight: number;
		function resize(event: MouseEvent) {
			if (event.clientX === 0 || event.clientY === 0) return;
			const left = event.clientX - resizeCorner.offsetWidth / 2;
			const bottom = event.clientY + resizeCorner.clientHeight / 2;
			wrapper.style.width = `${startRight - left}px`;
			wrapper.style.height = `${bottom - wrapper.offsetTop}px`;
		}
		resizeCorner.addEventListener("dragstart", () => {
			startRight = wrapper.offsetLeft + wrapper.offsetWidth;
		});
		resizeCorner.addEventListener("drag", (event) => resize(event));
		resizeCorner.addEventListener("dragend", (event) => resize(event));
	}

	// setup iframe
	const iframe = document.createElement("iframe");
	iframe.src = import.meta.env.DEV
		? "http://localhost:18181/src/iframe/index.html"
		: "/todo";
	iframe.style.cssText = "border: 0; width: 100%; height: 100%;";
	wrapper.appendChild(iframe);
	document.body.appendChild(wrapper);

	// setup rpc
	iframe.addEventListener("load", () => {
		const channel = new MessageChannel();

		exposeTinyRpc({
			routes: new RpcHandler(),
			adapter: messagePortServerAdapter({
				port: channel.port1,
			}),
		});
		channel.port1.start();

		tinyassert(iframe.contentWindow);
		iframe.contentWindow.postMessage("test message channel", "*", [
			channel.port2,
		]);
	});
}

main();
