import "../../styles.css";
import ReactDomClient from "react-dom/client";
import { getUiParams } from "../../utils/ui-params";
import { Root } from "./root";
import { RootControl } from "./root-control";

const uiParams = getUiParams();
const isControl = uiParams.has("control");

async function main() {
	const dom = document.querySelector("#root")!;
	const vdom = isControl ? <RootControl /> : <Root />;
	ReactDomClient.createRoot(dom).render(vdom);
}

main();
