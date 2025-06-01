import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "./src",
	manifest: {
		permissions: ["activeTab"],
	},
	webExt: {
		// no browser open
		// (manually load unpacked extension .output/chrome-mv3-dev)
		disabled: true,
	},
	vite: () => ({
		plugins: [react()],
	}),
});
