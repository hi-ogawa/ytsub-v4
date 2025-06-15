import { createBirpc } from "birpc";
import { browser } from "wxt/browser";

export function registerRpcHandler<T extends object>(
	name: string,
	handler: T,
	options?: { onConnect?: boolean },
) {
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
			if (options?.onConnect) {
				(rpc as any).onConnect(port.sender?.tab?.id);
			}
		}
	});
}

export function createRpcClient<T>(
	name: string,
	tabId?: number,
	options?: { onConnect?: (tabId?: number) => void },
) {
	const port = tabId
		? browser.tabs.connect(tabId, { name })
		: browser.runtime.connect({ name });
	const rpc = createBirpc<T, {}>(
		{
			onConnect(tabId?: number) {
				options?.onConnect?.(tabId);
			},
		},
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
