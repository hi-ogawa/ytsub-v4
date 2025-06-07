import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoMetadata } from "../../utils";

interface ProtocolMap {
	fetchMetadata(data: { videoId: string }): Promise<VideoMetadata>;
	play(time: number): void;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
