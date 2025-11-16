/**
 * Get UI parameters from either iframe URL or shadow DOM global state
 * This allows the same UI components to work in both iframe and shadow DOM modes
 */
export function getUiParams(): URLSearchParams {
	// In shadow DOM mode, parameters are stored globally
	if (window.__YTSUB_UI_PARAMS__) {
		return window.__YTSUB_UI_PARAMS__;
	}

	// In iframe mode, parameters come from the URL
	return new URL(window.location.href).searchParams;
}

declare global {
	interface Window {
		__YTSUB_UI_PARAMS__?: URLSearchParams;
	}
}
