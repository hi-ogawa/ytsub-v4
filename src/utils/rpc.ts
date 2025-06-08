import { createBirpc } from "birpc";
import { browser } from "wxt/browser";

export function registerRpcHandler<T extends object>(name: string, handler: T) {
	browser.runtime.onConnect.addListener((port) => {
		if (port.name === name) {
			const rpc = createBirpc<{}, T>(handler, {
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

export function createRpcClient<T>(name: string, tabId?: number) {
	const port = tabId
		? browser.tabs.connect(tabId, { name })
		: browser.runtime.connect({ name });
	const rpc = createBirpc<T, {}>(
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
