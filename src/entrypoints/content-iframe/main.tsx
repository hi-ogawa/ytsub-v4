import "../../styles.css";
import ReactDomClient from "react-dom/client";
import { Root } from "./root";
import { tinyassert } from "@hiogawa/utils";

async function main() {
	await new Promise<void>((resolve) => {
		window.addEventListener("message", (event) => {
			tinyassert(event.origin === "https://www.youtube.com");
			const port = event.ports[0];
			tinyassert(port);
			console.log(port);

			// rpcClient = proxyTinyRpc<RpcHandler>({
			// 	adapter: messagePortClientAdapter({ port }),
			// });
			port.start();
			resolve();
		});
	});

	const dom = document.querySelector("#root")!;
	const vdom = <Root />;
	ReactDomClient.createRoot(dom).render(vdom);
}

main();
