import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
	initContent: () => Promise<{
		tabId: number;
	}>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
