import "../styles.css";
import ReactDomClient from "react-dom/client";

export interface RenderOptions {
	tabId: number;
	videoId?: string;
	isControl: boolean;
}

// Global state for shadow DOM mode to store UI params
// This is needed because the components read params at module level
declare global {
	interface Window {
		__YTSUB_UI_PARAMS__?: URLSearchParams;
	}
}

/**
 * Render React UI into a shadow DOM container
 * This is used for shadow DOM mode to render the same UI components
 * that are used in iframe mode
 */
export async function renderInShadowDom(
	container: HTMLElement,
	options: RenderOptions,
): Promise<void> {
	// Create a fake URLSearchParams that the components can read
	const params = new URLSearchParams();
	params.set("tabId", String(options.tabId));
	if (options.videoId) {
		params.set("videoId", options.videoId);
	}
	if (options.isControl) {
		params.set("control", "true");
	}

	// Store params globally so components can access them
	window.__YTSUB_UI_PARAMS__ = params;

	// Create root div
	const rootDiv = document.createElement("div");
	rootDiv.id = "root";
	rootDiv.style.width = "100%";
	rootDiv.style.height = "100%";
	rootDiv.style.background = "transparent";
	container.appendChild(rootDiv);

	// Dynamically import components to ensure they read the params we just set
	const { Root } = await import("../entrypoints/content-iframe/root");
	const { RootControl } = await import(
		"../entrypoints/content-iframe/root-control"
	);

	// Render the appropriate component
	const vdom = options.isControl ? <RootControl /> : <Root />;
	ReactDomClient.createRoot(rootDiv).render(vdom);
}
