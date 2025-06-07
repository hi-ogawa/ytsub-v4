import "../../styles.css";
import { tinyassert } from "@hiogawa/utils";
import { createBirpc } from "birpc";
import ReactDomClient from "react-dom/client";
import { browser } from "wxt/browser";
// import { Root } from "./root";
import type { ContentRpcHandler } from "../content/main";

async function main() {
	// window.addEventListener("message", (event) => {
	// 	console.log("[🔥🔥🔥🔥 message]", event)
	// });
	browser.runtime.id;
	const contexts = await browser.runtime.getContexts({});
	console.log("[🔥]", contexts);
	// window.parent.postMessage()
	// await new Promise<void>((resolve) => {
	// 	window.addEventListener("message", (event) => {
	// 		console.log(event)
	// 		tinyassert(event.origin === "https://www.youtube.com");
	// 		const port = event.ports[0];
	// 		tinyassert(port);

	// 		const contentRpc = createBirpc<ContentRpcHandler, {}>(
	// 			{},
	// 			{
	// 				post: (data) => port.postMessage(data),
	// 				on: (fn) => port.addEventListener("message", (e) => fn(e.data)),
	// 			},
	// 		);
	// 		// rpcClient = proxyTinyRpc<RpcHandler>({
	// 		// 	adapter: messagePortClientAdapter({ port }),
	// 		// });
	// 		port.start();
	// 		contentRpc.ping().then(console.log);
	// 		resolve();
	// 	});
	// });

	// const dom = document.querySelector("#root")!;
	// const vdom = <Root />;
	// ReactDomClient.createRoot(dom).render(vdom);
}

main();
