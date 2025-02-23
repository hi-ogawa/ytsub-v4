import "/@vite/client";
import React from "react";
import ReactDOMClient from "react-dom/client";

function main() {
	ReactDOMClient.createRoot(document.getElementById("root")!).render(
		<React.StrictMode>
			<App />
		</React.StrictMode>,
	);
}

function App() {
	return (
		<main>
			<button
				onClick={() => {
					chrome.tabs.query(
						{ active: true, currentWindow: true },
						function (tabs) {
							const tab = tabs[0];
							if (tab?.id) {
								chrome.tabs.sendMessage(
									tab.id,
									{ message: "Hello from popup" },
									function (response) {
										console.log(response);
									},
								);
							}
						},
					);
				}}
			>
				Test
			</button>
		</main>
	);
}

main();
