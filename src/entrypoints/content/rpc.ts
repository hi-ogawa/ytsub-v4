import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoMetadata } from "@/utils";

interface ProtocolMap {
	fetchMetadata(videoId: string): Promise<VideoMetadata>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
