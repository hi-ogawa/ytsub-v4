import { createRpcClient, registerRpcHandler } from "../../utils/rpc";
import type { ContentService } from "./main";

const RPC_NAME = "content-rpc";

export function registerContentService(contentService: ContentService) {
	registerRpcHandler(RPC_NAME, contentService);
}

export function createContentServiceClient(tabId: number) {
	return createRpcClient<ContentService>(RPC_NAME, tabId);
}
