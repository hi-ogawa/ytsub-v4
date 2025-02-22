import { defineConfig } from "vite";

export default defineConfig({
	server: {
		port: 18181,
		origin: "http://localhost:18181",
		// TODO: how to allow access only from `chrome-extension://xxx?
		cors: true,
		allowedHosts: ["chrome-extension"],
	},
});
