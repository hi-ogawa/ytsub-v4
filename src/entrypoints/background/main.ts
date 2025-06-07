import { browser } from "wxt/browser";

async function main() {
	console.log("Hello background!", { id: browser.runtime.id });
}

main();

export {};
