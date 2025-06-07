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
	fetchMetadata(): Promise<VideoMetadata>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
