import "../../styles.css";
import ReactDomClient from "react-dom/client";
import { TypingPracticeViewRoot } from "../../components/typing";

async function main() {
	const dom = document.querySelector("#root")!;
	const vdom = <TypingPracticeViewRoot />;
	ReactDomClient.createRoot(dom).render(vdom);
}

main();
