import type { VideoMetadata } from "@/utils";
import { defineExtensionMessaging } from "@webext-core/messaging";

interface ProtocolMap {
	fetchMetadata(videoId: string): Promise<VideoMetadata>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();

// service
// getActiveVideo()
// fetchMetadata()
