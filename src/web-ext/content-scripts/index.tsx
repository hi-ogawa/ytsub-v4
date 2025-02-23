import React from "react";
import ReactDOMClient from "react-dom/client";

async function main() {
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
