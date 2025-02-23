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
	let [enabled, setEnabled] = React.useState(false);

	React.useEffect(() => {
		(async () => {
			setEnabled((await chrome.storage.local.get("enabled"))["enabled"]);
		})();
	}, []);

	return (
		<main style={{ width: "200px" }}>
			<label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
				<span>Show subtitles</span>
				<input
					type="checkbox"
					checked={enabled}
					onChange={(e) => {
						const value = e.currentTarget.checked;
						React.startTransition(async () => {
							await chrome.storage.local.set({ enabled: value });
							setEnabled(value);
						});
					}}
				/>
			</label>
		</main>
	);
}

main();
