import "./style.css";
import typescriptLogo from "@/assets/typescript.svg";
import viteLogo from "/wxt.svg";
import { setupCounter } from "./counter";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <a href="https://wxt.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="WXT logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>WXT + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the WXT and TypeScript logos to learn more
    </p>
  </div>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

async function main() {
	// TODO: can sidepanel directly talk to content script?
	const tabs = await browser.tabs.query({ active: true, currentWindow: true });
	// looks like it can
	console.log(tabs);
}

main();

// TODO
// https://developer.chrome.com/docs/extensions/reference/api/sidePanel

// RPC architecture
// sidepanel
// -
//
// background
// - just proxy
//
// content
// - video player
// - metadata api
