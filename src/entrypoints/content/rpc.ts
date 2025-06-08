import { createBirpc } from "birpc";
import { browser } from "wxt/browser";
import type { ContentService } from "./main";

export function registerContentService(contentService: ContentService) {
	browser.runtime.onConnect.addListener((port) => {
		if (port.name === "content-rpc") {
			const rpc = createBirpc<{}, ContentService>(contentService, {
				bind: "functions",
				post: (data) => port.postMessage(data),
				on: (fn) => port.onMessage.addListener(fn),
			});
			port.onDisconnect.addListener(() => {
				rpc.$close();
			});
		}
	});
}

export function createContentServiceClient(tabId: number) {
	const port = browser.tabs.connect(tabId, { name: "content-rpc" });
	const rpc = createBirpc<ContentService, {}>(
		{},
		{
			post: (data) => port.postMessage(data),
			on: (fn) => port.onMessage.addListener(fn),
		},
	);
	port.onDisconnect.addListener(() => {
		rpc.$close();
	});
	return rpc;
}
