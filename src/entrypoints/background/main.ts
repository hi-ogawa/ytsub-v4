import { onMessage } from "./rpc";

export async function main() {
	onMessage("initContent", async (e) => {
		return {
			tabId: e.sender.tab!.id!,
		};
	});
}
