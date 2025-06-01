import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
	matches: ["https://www.youtube.com/*"],
	main() {
		import("./main");
	},
});
