import "/@vite/client";
import React from "react";
import ReactDOMClient from "react-dom/client";

function main() {
	ReactDOMClient.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}

import { type TinyRpcClientAdapter, proxyTinyRpc } from "@hiogawa/tiny-rpc";
import type { RpcHandler } from "../content-scripts";

export const rpc = proxyTinyRpc<RpcHandler>({
	adapter: rpcClientAdapterPopup(),
});

function rpcClientAdapterPopup(): TinyRpcClientAdapter {
	return {
		send: async (data) => {
			const tabs = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});
			const tab = tabs[0]!;
			const result = await chrome.tabs.sendMessage(tab.id!, data);
			if (result.ok) {
				return result.value;
			} else {
				throw Object.assign(new Error("rpc error"), result.value);
			}
		},
	};
}

function App() {
	return (
		<main style={{ width: "500px" }}>
			<a href={window.location.href} target="_blank">
				Pop out to tab
			</a>
			<div>{typeof chrome}</div>
			<button
				onClick={async () => {
					const result = await rpc.fetchMetadata("GRgUK0JGoNg");
					console.log(result);
					// chrome.tabs.query(
					// 	{ active: true, currentWindow: true },
					// 	function (tabs) {
					// 		const tab = tabs[0];
					// 		if (tab?.id) {
					// 			chrome.tabs.sendMessage(
					// 				tab.id,
					// 				{ message: "Hello from popup" },
					// 				function (response) {
					// 					console.log(response);
					// 				},
					// 			);
					// 		}
					// 	},
					// );
				}}
			>
				Test
			</button>
		</main>
	);
}

main();
