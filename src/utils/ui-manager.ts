import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { createIframeUi } from "wxt/utils/content-script-ui/iframe";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";

/**
 * Unified interface for both iframe and shadow DOM UI
 */
export interface UnifiedContentScriptUi {
	mount(): void;
	remove(): void;
	wrapper: HTMLElement;
}

export type UiMode = "iframe" | "shadow-dom";

export interface UiManagerOptions {
	mode: UiMode;
	tabId: number;
	videoId?: string;
	isControl?: boolean;
	position: "inline";
	anchor: string;
	onMount?: (wrapper: HTMLElement) => void | Promise<void>;
}

/**
 * Creates a UI instance that can work in either iframe or shadow DOM mode
 */
export async function createContentScriptUi(
	ctx: ContentScriptContext,
	options: UiManagerOptions,
): Promise<UnifiedContentScriptUi> {
	if (options.mode === "iframe") {
		return createIframeMode(ctx, options);
	}
	return createShadowDomMode(ctx, options);
}

function createIframeMode(
	ctx: ContentScriptContext,
	options: UiManagerOptions,
): UnifiedContentScriptUi {
	const params = new URLSearchParams();
	params.set("tabId", String(options.tabId));
	if (options.videoId) {
		params.set("videoId", options.videoId);
	}
	if (options.isControl) {
		params.set("control", "true");
	}

	const ui = createIframeUi(ctx, {
		page: `content-iframe.html?${params.toString()}`,
		position: options.position,
		anchor: options.anchor,
		onMount: async (wrapper, iframe) => {
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "none";
			await options.onMount?.(wrapper);
		},
	});

	return {
		mount: () => ui.mount(),
		remove: () => ui.remove(),
		wrapper: ui.wrapper,
	};
}

async function createShadowDomMode(
	ctx: ContentScriptContext,
	options: UiManagerOptions,
): Promise<UnifiedContentScriptUi> {
	const name = options.isControl ? "ytsub-control-ui" : "ytsub-main-ui";

	const ui = await createShadowRootUi(ctx, {
		name,
		position: options.position,
		anchor: options.anchor,
		mode: "open",
		onMount: async (uiContainer) => {
			// Import and render React component directly into shadow DOM
			const { renderInShadowDom } = await import("./ui-render");
			await renderInShadowDom(uiContainer, {
				tabId: options.tabId,
				videoId: options.videoId,
				isControl: options.isControl ?? false,
			});

			// Apply custom styles to wrapper via shadowHost
			await options.onMount?.(ui.shadowHost);
		},
	});

	return {
		mount: () => ui.mount(),
		remove: () => ui.remove(),
		wrapper: ui.shadowHost,
	};
}

/**
 * Determine UI mode based on environment
 * - Development: iframe (for HMR support)
 * - Production: shadow-dom (for better accessibility to other extensions)
 */
export function getDefaultUiMode(): UiMode {
	// In WXT, import.meta.env.MODE is "development" for dev and "production" for build
	return import.meta.env.MODE === "development" ? "iframe" : "shadow-dom";
}
