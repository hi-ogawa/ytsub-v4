export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  main() {
    console.log('Hello content.');
  },
});
