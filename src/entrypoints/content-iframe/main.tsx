import ReactDomClient from "react-dom/client";
import { Root } from "./root";

async function main() {
	const dom = document.querySelector("#root")!;
	const vdom = <Root />;
	ReactDomClient.createRoot(dom).render(vdom);
}

main();
