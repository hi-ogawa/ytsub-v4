import {
	TinyRpcProxy,
	messagePortClientAdapter,
	proxyTinyRpc,
} from "@hiogawa/tiny-rpc";
import { tinyassert } from "@hiogawa/utils";
import React from "react";
import ReactDOMClient from "react-dom/client";
import type { RpcHandler } from "../web-ext/content-scripts";

let rpcClient: TinyRpcProxy<RpcHandler>;

async function main() {
	await new Promise<void>((resolve) => {
		window.addEventListener("message", (event) => {
			console.log(event);
			tinyassert(event.origin === "https://www.youtube.com");
			const port = event.ports[0];
			tinyassert(port);

			rpcClient = proxyTinyRpc<RpcHandler>({
				adapter: messagePortClientAdapter({ port }),
			});
			port.start();

			resolve();
		});
	});

	ReactDOMClient.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}

function App() {
	return (
		<div>
			<button
				onClick={async () => {
					const result = await rpcClient.fetchMetadata("GRgUK0JGoNg");
					console.log(result);
				}}
			>
				Test
			</button>
			<button
				onClick={() => {
					rpcClient.play();
				}}
			>
				play
			</button>
			<button
				onClick={() => {
					rpcClient.pause();
				}}
			>
				pause
			</button>
		</div>
	);
}

main();
