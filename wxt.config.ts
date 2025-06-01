import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "./src",
	manifest: {
		permissions: ["activeTab"],
	},
	webExt: {
		// no browser open
		disabled: true,
	},
});
