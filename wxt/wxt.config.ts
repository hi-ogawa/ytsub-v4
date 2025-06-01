import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: {
		permissions: ["activeTab"],
	},
	webExt: {
		// disable auto browser open
		disabled: true,
	},
});
