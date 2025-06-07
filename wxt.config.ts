import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "wxt";

export default defineConfig({
	srcDir: "./src",
	manifest: (env) => ({
		name: env.command === "build" ? "ytsub" : "ytsub (dev)",
		permissions: ["activeTab"],
		web_accessible_resources: [
			{
				resources: ["content-iframe.html"],
				matches: ["https://www.youtube.com/*"],
			},
		],
	}),
	webExt: {
		// disable opening browser on dev
		// (manually load unpacked extension .output/chrome-mv3-dev)
		disabled: true,
	},
	modules: ["@wxt-dev/auto-icons"],
	vite: () => ({
		plugins: [react(), tailwindcss()],
	}),
});
