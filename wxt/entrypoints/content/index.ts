export default defineContentScript({
	matches: ["https://www.youtube.com/*"],
	main() {
		import("./main");
	},
});
