import { browser } from "wxt/browser";

export async function main() {
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message === "background-rpc-init") {
			sendResponse(sender.tab?.id);
		}
	});
}
