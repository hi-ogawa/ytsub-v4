import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
	matches: ["https://www.youtube.com/*"],
	main(ctx) {
		ctx;
		import("./main");

		// TODO
		// - how to close and open?
		//   - use popup ui to control?
		// - how to resize?

		const ui = createIframeUi(ctx, {
			page: "content-iframe.html",
			position: "inline",
			anchor: "body",
			onMount: (wrapper, iframe) => {
				wrapper.style.position = "fixed";
				wrapper.style.top = "5vh";
				wrapper.style.height = "90vh";
				wrapper.style.right = "10px";
				wrapper.style.width = "480px";
				wrapper.style.zIndex = "100000";
				iframe.style.width = "100%";
				iframe.style.height = "100%";
				iframe.style.border = "none";
			},
		});
		ui.mount();
	},
});
