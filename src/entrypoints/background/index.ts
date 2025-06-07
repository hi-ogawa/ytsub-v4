import { defineBackground } from "wxt/utils/define-background";

export default defineBackground({
	async main() {
		const { main } = await import("./main");
		await main();
	},
});
