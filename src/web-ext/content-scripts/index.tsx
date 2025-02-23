import React from "react";
import ReactDOMClient from "react-dom/client";

export type { RpcHandler };

class RpcHandler {
	constructor() {}

	fetchMetadata(videoId: string) {}

	play() {}

	pause() {}

	seek() {}
}

import { type TinyRpcServerAdapter, exposeTinyRpc } from "@hiogawa/tiny-rpc";

function rpcServerAdapterCotentScript(): TinyRpcServerAdapter<void> {
	return {
		register: (invokeRoute) => {
			chrome.runtime.onMessage.addListener(
				async (message, _sender, sendResponse) => {
					try {
						const value = await invokeRoute(message);
						sendResponse({ ok: true, value });
					} catch (e) {
						sendResponse({ ok: false, value: e });
					}
				},
			);
		},
	};
}

function setupRpc() {
	exposeTinyRpc({
		routes: new RpcHandler(),
		adapter: rpcServerAdapterCotentScript(),
	});
}

async function main() {
	setupRpc();
	if (1) return;
	renderApp();
	chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
		// alert("RECEIVED: " + JSON.stringify(message))

		const host = document.createElement("div");
		const shadowRoot = host.attachShadow({ mode: "closed" });
		// const style = document.createElement("style");
		// style.textContent = `
		//   @import "/src/web-ext/styles.css"
		// `;
		// shadowRoot.appendChild(style);
		// shadowRoot.innerHTML = `<pre>${JSON.stringify(message)}</pre>`;

		host.style.cssText = `
			position: absolute;
			z-index: 10000;
			background: #ffffff;
		`;
		document.body.appendChild(host);

		function App() {
			return (
				<div>
					<pre>{JSON.stringify(message)}</pre>
					<button
						onClick={() => {
							const el = document.querySelector<HTMLVideoElement>(
								"video.html5-main-video",
							)!;
							el.play();
						}}
					>
						Play
					</button>
					<button
						onClick={() => {
							const el = document.querySelector<HTMLVideoElement>(
								"video.html5-main-video",
							)!;
							el.pause();
						}}
					>
						Pause
					</button>
				</div>
			);
		}

		ReactDOMClient.createRoot(shadowRoot).render(
			<React.StrictMode>
				<App />
			</React.StrictMode>,
		);
	});
	// const url = new URL(window.location.href);
	// if (url.pathname === '/watch') {
	//   const videoId = url.searchParams.get('v');
	//   if (videoId) {
	//     const metadata = await fetchMetadataJson(videoId);
	//     console.log(metadata)
	//     alert("okay!!")
	//   }
	// }
}

// TODO: use iframe for rendering (which allows dev hmr)
// TODO: only need to setup RPC for video playback, cors-protected video data fetching, etc...
//       can we use `window.postMessage`  here?
function renderApp() {
	const host = document.createElement("div");
	const shadowRoot = host.attachShadow({ mode: "closed" });
	host.style.cssText = `
		position: absolute;
		z-index: 10000;
		background: #ffffff;
	`;
	document.body.appendChild(host);

	function App() {
		return (
			<div>
				<button
					onClick={() => {
						const el = document.querySelector<HTMLVideoElement>(
							"video.html5-main-video",
						)!;
						el.play();
					}}
				>
					Play
				</button>
				<button
					onClick={() => {
						const el = document.querySelector<HTMLVideoElement>(
							"video.html5-main-video",
						)!;
						el.pause();
					}}
				>
					Pause
				</button>
				{/* TODO: will iframe also work for non localhost? */}
				<iframe src="http://localhost:18181/src/web-ext/options/index.html"></iframe>
			</div>
		);
	}

	ReactDOMClient.createRoot(shadowRoot).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}

async function fetchMetadataJson(videoId: string) {
	const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
		method: "POST",
		body: JSON.stringify({
			videoId,
			context: {
				client: {
					clientName: "IOS",
					clientVersion: "19.45.4",
					deviceMake: "Apple",
					deviceModel: "iPhone16,2",
					userAgent:
						"com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
					osName: "iPhone",
					osVersion: "18.1.0.22B83",
					hl: "en",
					timeZokne: "UTC",
					utcOffsetMinutes: 0,
				},
			},
			playbackContext: {
				contentPlaybackContext: {
					html5Preference: "HTML5_PREF_WANTS",
					signatureTimestamp: 20073,
				},
			},
			contentCheckOk: true,
			racyCheckOk: true,
		}),
		headers: {
			"X-YouTube-Client-Name": "5",
			"X-YouTube-Client-Version": "19.45.4",
			Origin: "https://www.youtube.com",
			"User-Agent":
				"com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 18_1_0 like Mac OS X;)",
			"content-type": "application/json",
			"X-Goog-Visitor-Id": "CgtwU3N6UXVjakdWbyi94bi7BjIKCgJKUBIEGgAgUQ%3D%3D",
		},
	});
	return await res.json();
}

main();
