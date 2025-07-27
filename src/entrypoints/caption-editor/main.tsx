import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function App() {
	const [videoId, setVideoId] = React.useState("");
	const [metadata, setMetadata] = React.useState<any>(null);
	const [error, setError] = React.useState<string>("");
	const [isLoading, setIsLoading] = React.useState(false);
	const [iframeReady, setIframeReady] = React.useState(false);
	const [pendingRequests, setPendingRequests] = React.useState<Map<string, { resolve: Function, reject: Function }>>(new Map());
	const [iframeSender, setIframeSender] = React.useState<{ tabId?: number, frameId?: number } | null>(null);

	// Wait for iframe to load and inject content script
	React.useEffect(() => {
		const iframe = document.getElementById('youtube-api-frame') as HTMLIFrameElement;
		if (!iframe) return;

		const handleLoad = () => {
			console.log('Iframe loaded:', iframe.src);
			// Content script should inject automatically due to all_frames: true
		};

		iframe.addEventListener('load', handleLoad);
		return () => iframe.removeEventListener('load', handleLoad);
	}, []);

	// Listen for messages from iframe content script
	React.useEffect(() => {
		const handleMessage = (message: any, sender: chrome.runtime.MessageSender, sendResponse: Function) => {
			console.log('Received message:', message, 'from:', sender);

			if (message.type === 'IFRAME_CONTENT_SCRIPT_READY') {
				console.log('Iframe content script is ready!', 'sender:', sender);
				setIframeReady(true);
				setIframeSender({ tabId: sender.tab?.id, frameId: sender.frameId });
				sendResponse({ received: true });
			} else if (message.type === 'YOUTUBE_API_RESPONSE') {
				console.log('Received API response:', message);
				
				const request = pendingRequests.get(message.requestId);
				if (!request) {
					console.warn('No pending request found for ID:', message.requestId);
					return;
				}

				setPendingRequests(prev => {
					const newMap = new Map(prev);
					newMap.delete(message.requestId);
					return newMap;
				});

				if (message.success) {
					setMetadata(message.data);
					request.resolve(message.data);
				} else {
					const errorMsg = message.error || 'API request failed';
					setError(errorMsg);
					request.reject(new Error(errorMsg));
				}
				setIsLoading(false);
				sendResponse({ received: true });
			}
		};

		chrome.runtime.onMessage.addListener(handleMessage);
		return () => chrome.runtime.onMessage.removeListener(handleMessage);
	}, [pendingRequests]);

	const sendMessageToIframe = (action: string, payload: any): Promise<any> => {
		return new Promise((resolve, reject) => {
			if (!iframeSender?.tabId) {
				reject(new Error('Iframe sender not found'));
				return;
			}

			const requestId = Math.random().toString(36).substr(2, 9);
			
			setPendingRequests(prev => new Map(prev).set(requestId, { resolve, reject }));

			// Send message directly to the iframe tab and frame
			chrome.tabs.sendMessage(
				iframeSender.tabId,
				{
					type: 'YOUTUBE_API_REQUEST',
					requestId,
					action,
					...payload
				},
				{ frameId: iframeSender.frameId },
				(response) => {
					if (chrome.runtime.lastError) {
						console.error('Message sending failed:', chrome.runtime.lastError);
						setPendingRequests(prev => {
							const newMap = new Map(prev);
							newMap.delete(requestId);
							return newMap;
						});
						reject(new Error(chrome.runtime.lastError.message));
					}
					console.log('Message sent to iframe, response:', response);
				}
			);
		});
	};

	const testApiAccess = async () => {
		if (!videoId.trim()) return;
		
		setIsLoading(true);
		setError("");
		setMetadata(null);
		
		try {
			if (!iframeReady) {
				throw new Error("Iframe content script not ready. Please wait a moment and try again.");
			}

			console.log("Sending API request to iframe...");
			await sendMessageToIframe('fetchMetadata', { videoId });
			
		} catch (err) {
			console.error("API request failed:", err);
			setError(err instanceof Error ? err.message : "Unknown error");
			setIsLoading(false);
		}
	};

	return (
		<div className="app">
			<header className="header">
				<h1>YTSub Caption Editor</h1>
				<p>Test YouTube API access via hidden iframe</p>
			</header>

			<main className="main">
				<div className="test-section">
					<h2>YouTube API Test</h2>
					<div className="status-info">
						<p><strong>Iframe Content Script:</strong> {iframeReady ? "Ready" : "Loading..."}</p>
						<p><strong>Iframe Location:</strong> {iframeSender ? `Tab ${iframeSender.tabId}, Frame ${iframeSender.frameId}` : "Not found"}</p>
						<p><strong>Pending Requests:</strong> {pendingRequests.size}</p>
					</div>
					
					<div className="input-group">
						<input
							type="text"
							placeholder="Enter YouTube Video ID (e.g., dQw4w9WgXcQ)"
							value={videoId}
							onChange={(e) => setVideoId(e.target.value)}
							className="video-input"
						/>
						<button 
							onClick={testApiAccess} 
							disabled={isLoading || !videoId.trim() || !iframeReady || !iframeSender}
							className="test-button"
						>
							{isLoading ? "Testing..." : "Test API Access"}
						</button>
					</div>

					{error && (
						<div className="error">
							<strong>Error:</strong> {error}
						</div>
					)}

					{metadata && (
						<div className="success">
							<strong>Success:</strong>
							<pre>{JSON.stringify(metadata, null, 2)}</pre>
						</div>
					)}
				</div>

				{/* Hidden YouTube iframe for API access */}
				<iframe
					id="youtube-api-frame"
					// src={videoId ? `https://www.youtube.com/embed/${videoId}` : "https://www.youtube.com/embed/dQw4w9WgXcQ"}
					src={"https://www.youtube.com/embed/dQw4w9WgXcQ"}
					style={{
						position: "absolute",
						top: "-1000px",
						left: "-1000px",
						width: "1px",
						height: "1px",
						border: "none",
						visibility: "hidden"
					}}
					title="YouTube API Access"
				/>

				{/* Debug section */}
				<div className="debug-section">
					<h3>Debug: Hidden iframe communication test</h3>
					<p>This tests if we can communicate with the YouTube content script in the hidden iframe above.</p>
				</div>
			</main>
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}