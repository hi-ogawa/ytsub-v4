import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
	matches: ["https://www.youtube.com/*"],
	cssInjectionMode: 'ui',
	async main(ctx) {
		const { main } = await import("./main");
		await main(ctx);
	},
});
