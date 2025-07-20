import { storage } from "wxt/utils/storage";
import { registerRpcHandler } from "../../utils/rpc";

const uiWidthStorage = storage.defineItem(`local:ui-size`, {
	fallback: 480,
});

export type { BackgroundService };

class BackgroundService {
	async getUiWidth() {
		return uiWidthStorage.getValue();
	}

	async setUiWidth(width: number) {
		await uiWidthStorage.setValue(width);
	}
}

export async function main() {
	registerRpcHandler("background-rpc", new BackgroundService(), {
		onConnect: true,
	});
}
