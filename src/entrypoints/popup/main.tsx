import ReactDOM from "react-dom/client";
import "../../styles.css";

function Popup() {
	const openCaptionEditor = async () => {
		try {
			const [tab] = await chrome.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab.url?.includes("youtube.com/watch")) {
				alert("Please open a YouTube video first");
				return;
			}

			const url = new URL(tab.url);
			const videoId = url.searchParams.get("v");

			if (!videoId) {
				alert("No video ID found in current tab");
				return;
			}

			const extensionUrl = chrome.runtime.getURL(
				`caption-editor.html?v=${videoId}`,
			);
			await chrome.tabs.create({ url: extensionUrl });

			window.close();
		} catch (error) {
			console.error("Error opening caption editor:", error);
			alert("Error opening caption editor");
		}
	};

	return (
		<div className="w-64 p-4">
			<h2 className="text-lg font-semibold mb-4">ytsub</h2>
			<button
				onClick={openCaptionEditor}
				className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
			>
				Open Caption Editor
			</button>
		</div>
	);
}

const root = ReactDOM.createRoot(document.getElementById("app")!);
root.render(<Popup />);
