import { defineExtensionMessaging } from "@webext-core/messaging";
import type { VideoMetadata } from "../../utils";

interface ProtocolMap {
	fetchMetadata(data: { videoId: string }): Promise<VideoMetadata>;
	// fetchMetadata(): Promise<VideoMetadata>;
}

export const { sendMessage, onMessage } =
	defineExtensionMessaging<ProtocolMap>();
