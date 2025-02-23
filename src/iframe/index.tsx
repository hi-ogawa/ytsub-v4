import {
	type TinyRpcProxy,
	messagePortClientAdapter,
	proxyTinyRpc,
} from "@hiogawa/tiny-rpc";
import { tinyassert } from "@hiogawa/utils";
import React from "react";
import ReactDOMClient from "react-dom/client";
import { type VideoMetadata } from "../utils";
import type { RpcHandler } from "../web-ext/content-scripts";

let rpcClient: TinyRpcProxy<RpcHandler>;

async function main() {
	await new Promise<void>((resolve) => {
		window.addEventListener("message", (event) => {
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
	const [metadata, setMetadata] = React.useState<VideoMetadata>();
	return (
		<div>
			<button
				onClick={async () => {
					const result = await rpcClient.getMetadata();
					if (result) {
						result.captions?.playerCaptionsTracklistRenderer.captionTracks;
					}
					setMetadata(result);
				}}
			>
				Load subtitles
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
			<button
				onClick={() => {
					rpcClient.close();
				}}
			>
				close
			</button>
			{/* <pre>{metadata && JSON.stringify(metadata, null, 2)}</pre> */}
			<pre>
				{JSON.stringify(
					metadata?.captions?.playerCaptionsTracklistRenderer.captionTracks,
					null,
					2,
				)}
			</pre>
		</div>
	);
}

main();
