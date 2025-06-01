async function main() {
	console.log("Hello background!", { id: browser.runtime.id });

	// https://developer.chrome.com/docs/extensions/reference/api/sidePanel

	// https://github.com/GoogleChrome/chrome-extensions-samples/blob/20d36c778028f25fb139b83fdd9910b530bd9ea2/functional-samples/cookbook.sidepanel-site-specific/service-worker.js
	// chrome.sidePanel
	//   .setPanelBehavior({ openPanelOnActionClick: true })
	//   .catch((error) => console.error(error));

	// chrome.tabs.onActivated.addListener(async (activeInfo) => {
	//   const tab = await chrome.tabs.get(activeInfo.tabId);
	//   const tabId = activeInfo.tabId;
	//   console.log("[chrome.tabs.onActivated]", activeInfo, tab.url, tab);
	//   if (!tab.url) return;
	//   const url = new URL(tab.url);
	//   if (url.origin === "https://www.youtube.com") {
	//     await chrome.sidePanel.setOptions({
	//       tabId,
	//       path: 'sidepanel.html',
	//       enabled: true
	//     });
	//   } else {
	//     chrome.sidePanel.open
	//     // Disables the side panel on all other sites
	//     await chrome.sidePanel.setOptions({
	//       tabId,
	//       enabled: false
	//     });
	//   }
	// })
	// chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
	//   console.log("[chrome.tabs.onUpdated]", tabId, tab.url, tab)
	//   if (!tab.url) return;
	//   const url = new URL(tab.url);
	//   if (url.origin === "https://www.youtube.com") {
	//     await chrome.sidePanel.setOptions({
	//       tabId,
	//       path: 'sidepanel.html',
	//       enabled: true
	//     });
	//   } else {
	//     // Disables the side panel on all other sites
	//     await chrome.sidePanel.setOptions({
	//       tabId,
	//       enabled: false
	//     });
	//   }
	// });
}

main();
