import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoMetadata } from "../../utils";

interface ProtocolMap {
	fetchMetadata(data: { videoId: string }): Promise<VideoMetadata>;
	play(): void;
	pause(): void;
	seek(time: number): void;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
