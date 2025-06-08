import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoMetadata } from "../../utils";

// TODO: refactor
interface ProtocolMap {
	getState(): {
		mounted: boolean;
		playing: boolean;
		time: number;
	};

	// ui
	show(): void;
	hide(): void;

	// video player
	play(time: number): void;

	// youtube api proxy
	fetchMetadata(videoId: string): Promise<VideoMetadata>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();

import { createBirpc } from "birpc";
import { browser } from "wxt/browser";
import type { ContentService, ContentState } from "./main";

export function registerContentService(contentService: ContentService) {
	browser.runtime.onConnect.addListener((port) => {
		if (port.name === "content-rpc") {
			const rpc = createBirpc<{}, ContentService>(contentService, {
				bind: "functions",
				post: (data) => {
					// console.log("💚 [post]", data);
					return port.postMessage(data);
				},
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
			post: (data) => {
				// console.log("❤️ [post]", data);
				return port.postMessage(data);
			},
			on: (fn) => port.onMessage.addListener(fn),
		},
	);
	port.onDisconnect.addListener(() => {
		rpc.$close();
	});
	return rpc;
}

import { storage } from "wxt/utils/storage";

type ContentStates = Record<number, ContentState>;

export const contentStatesStorage = storage.defineItem<ContentStates>(
	"session:content-states",
	{
		fallback: {},
	},
);

export async function updateContentState(tabId: number, state: ContentState) {
	const current = await contentStatesStorage.getValue();
	await contentStatesStorage.setValue({ ...current, [tabId]: state });
}
