# UI Architecture - Iframe and Shadow DOM Modes

## Overview

The ytsub extension UI supports two rendering modes that are automatically selected based on the build environment:

- **Iframe Mode** (Development): Provides clean isolation and Hot Module Replacement (HMR) support
- **Shadow DOM Mode** (Production): Allows other extensions to access UI elements while maintaining style isolation

This dual-mode architecture enables optimal developer experience during development while maximizing extensibility in production.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         YouTube Page                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Content Script (content/main.ts)              │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │           ContentService                             │  │  │
│  │  │  • uiMode = getDefaultUiMode()                       │  │  │
│  │  │  • controlUI: UnifiedContentScriptUi                 │  │  │
│  │  │  • ui: UnifiedContentScriptUi (main panel)           │  │  │
│  │  └───────────────────┬─────────────────────────────────┘  │  │
│  │                      │                                     │  │
│  │         ┌────────────▼────────────┐                       │  │
│  │         │   UI Manager Factory    │                       │  │
│  │         │ (ui-manager.ts)         │                       │  │
│  │         │                         │                       │  │
│  │         │ createContentScriptUi() │                       │  │
│  │         └────┬───────────────┬────┘                       │  │
│  │              │               │                            │  │
│  │    MODE=dev  │               │  MODE=prod                 │  │
│  │              │               │                            │  │
│  │    ┌─────────▼──┐      ┌────▼──────────┐                 │  │
│  │    │  Iframe    │      │  Shadow DOM   │                 │  │
│  │    │   Mode     │      │     Mode      │                 │  │
│  │    └─────┬──────┘      └────┬──────────┘                 │  │
│  │          │                  │                             │  │
│  └──────────┼──────────────────┼─────────────────────────────┘  │
│             │                  │                                │
│    ┌────────▼────────┐  ┌──────▼──────────┐                    │
│    │   <iframe>      │  │ <ytsub-*-ui>    │                    │
│    │   element       │  │  (custom elem)  │                    │
│    │                 │  │                 │                    │
│    │ ┌─────────────┐ │  │ ┌─────────────┐ │                    │
│    │ │content-iframe│ │  │ │#shadow-root││                    │
│    │ │   .html     │ │  │ │   (open)    ││                    │
│    │ └──────┬──────┘ │  │ └──────┬──────┘│                    │
│    │        │        │  │        │       │                    │
│    └────────┼────────┘  └────────┼───────┘                    │
│             │                    │                             │
│    ┌────────▼────────────────────▼────────┐                    │
│    │         URL Params Bridge            │                    │
│    │      (ui-params.ts)                  │                    │
│    │                                       │                    │
│    │  getUiParams()                        │                    │
│    │    ├─ iframe: read from window.location│                  │
│    │    └─ shadow: read from window.__YTSUB│                   │
│    │              _UI_PARAMS__             │                    │
│    └────────┬──────────────────────────────┘                   │
│             │                                                   │
│    ┌────────▼──────────────────────────┐                       │
│    │   React UI Components             │                       │
│    │   • Root (main subtitle panel)    │                       │
│    │   • RootControl (toggle button)   │                       │
│    │                                    │                       │
│    │   *Shared code - works in both    │                       │
│    │    iframe and shadow DOM modes*   │                       │
│    └────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Mode Selection

### Automatic Environment Detection

```typescript
// ui-manager.ts
export function getDefaultUiMode(): UiMode {
  return import.meta.env.MODE === "development" 
    ? "iframe" 
    : "shadow-dom";
}
```

| Build Command | `import.meta.env.MODE` | Selected Mode | Use Case |
|--------------|----------------------|---------------|----------|
| `pnpm dev` | `"development"` | iframe | Development with HMR |
| `pnpm build` | `"production"` | shadow-dom | Production deployment |

## Component Architecture

### 1. UI Manager (`src/utils/ui-manager.ts`)

The central abstraction layer that provides a unified interface for both rendering modes.

**Key Components:**

```typescript
// Unified interface that both modes implement
export interface UnifiedContentScriptUi {
  mount(): void;      // Add UI to DOM
  remove(): void;     // Remove UI from DOM
  wrapper: HTMLElement; // Container element
}

// Factory function
export async function createContentScriptUi(
  ctx: ContentScriptContext,
  options: UiManagerOptions,
): Promise<UnifiedContentScriptUi>
```

**Responsibilities:**
- Mode selection based on environment
- Normalizing WXT's `createIframeUi` and `createShadowRootUi` APIs
- Creating appropriate UI instance based on mode
- Handling UI parameters for both modes

### 2. Iframe Mode Implementation

**Flow:**
1. `createIframeMode()` calls WXT's `createIframeUi()`
2. Constructs URL with query parameters: `content-iframe.html?tabId=X&videoId=Y`
3. WXT loads the HTML page into an iframe
4. React components in iframe read params from `window.location.href`

**Characteristics:**
- ✅ Complete isolation (CSS, JS, DOM)
- ✅ HMR support for rapid development
- ✅ Clean separation of concerns
- ❌ Inaccessible to other extensions
- ❌ Slight performance overhead

### 3. Shadow DOM Mode Implementation

**Flow:**
1. `createShadowDomMode()` calls WXT's `createShadowRootUi()`
2. Creates custom element (`<ytsub-control-ui>` or `<ytsub-main-ui>`)
3. Attaches shadow root with `mode: "open"`
4. Dynamically imports `ui-render.tsx`
5. `renderInShadowDom()` sets `window.__YTSUB_UI_PARAMS__` globally
6. Imports and renders React components into shadow DOM

**Characteristics:**
- ✅ Accessible to other extensions (open shadow root)
- ✅ CSS isolation via Shadow DOM
- ✅ No iframe overhead
- ❌ No HMR support (acceptable for production)
- ⚠️ Global state required for params (`window.__YTSUB_UI_PARAMS__`)

### 4. Shadow DOM Renderer (`src/utils/ui-render.tsx`)

**Purpose:** Dynamically render React components into shadow DOM containers.

**Key Implementation:**

```typescript
export async function renderInShadowDom(
  container: HTMLElement,
  options: RenderOptions,
): Promise<void> {
  // 1. Create URL params from options
  const params = new URLSearchParams();
  params.set("tabId", String(options.tabId));
  if (options.videoId) params.set("videoId", options.videoId);
  if (options.isControl) params.set("control", "true");
  
  // 2. Store globally for components to access
  window.__YTSUB_UI_PARAMS__ = params;
  
  // 3. Create root div
  const rootDiv = document.createElement("div");
  rootDiv.id = "root";
  container.appendChild(rootDiv);
  
  // 4. Dynamically import React components
  const { Root } = await import("../entrypoints/content-iframe/root");
  const { RootControl } = await import("../entrypoints/content-iframe/root-control");
  
  // 5. Render appropriate component
  const vdom = options.isControl ? <RootControl /> : <Root />;
  ReactDomClient.createRoot(rootDiv).render(vdom);
}
```

**Why Dynamic Import?**
- Ensures `window.__YTSUB_UI_PARAMS__` is set before components execute
- Components read params at module-level initialization
- Dynamic import guarantees correct execution order

### 5. UI Params Bridge (`src/utils/ui-params.ts`)

**Purpose:** Abstract away the difference in how params are provided between modes.

```typescript
export function getUiParams(): URLSearchParams {
  // Shadow DOM mode: params stored globally
  if (window.__YTSUB_UI_PARAMS__) {
    return window.__YTSUB_UI_PARAMS__;
  }
  
  // Iframe mode: params from URL
  return new URL(window.location.href).searchParams;
}
```

**Usage in Components:**

```typescript
// Before: Direct URL reading (iframe only)
const uiParams = new URL(window.location.href).searchParams;

// After: Works in both modes
const uiParams = getUiParams();
const tabId = Number(uiParams.get("tabId"));
const videoId = String(uiParams.get("videoId"));
```

## CSS Injection

Shadow DOM mode requires special CSS handling to ensure styles are properly isolated.

**Configuration:**

```typescript
// src/entrypoints/content/index.ts
export default defineContentScript({
  matches: ["https://www.youtube.com/*"],
  cssInjectionMode: "ui", // ← Critical for shadow DOM
  async main(ctx) {
    const { main } = await import("./main");
    await main(ctx);
  },
});
```

**How it Works:**
- `cssInjectionMode: "ui"` tells WXT to make CSS available to UI containers
- WXT automatically injects CSS into shadow roots created via `createShadowRootUi()`
- Styles imported in content script are available to shadow DOM

## Content Service Integration

### Initialization Flow

```typescript
export class ContentService {
  ui?: UnifiedContentScriptUi;        // Main subtitle panel
  controlUI?: UnifiedContentScriptUi; // Toggle button
  uiMode = getDefaultUiMode();        // Auto-detect mode
  private initPromise: Promise<void>; // Async init tracking
  
  constructor(ctx: ContentScriptContext, tabId: number) {
    // Initialize control UI asynchronously
    this.initPromise = this.initControlUI();
  }
  
  async initControlUI() {
    // Create control UI using selected mode
    this.controlUI = await createContentScriptUi(this.ctx, {
      mode: this.uiMode,
      tabId: this.tabId,
      isControl: true,
      position: "inline",
      anchor: "body",
      onMount: async (wrapper) => {
        // Position the toggle button
        wrapper.style.position = "fixed";
        wrapper.style.height = "45px";
        wrapper.style.width = "45px";
        wrapper.style.right = "15px";
        wrapper.style.bottom = "15px";
        wrapper.style.zIndex = "100000";
        wrapper.hidden = !this.getPageState().videoId;
      },
    });
    this.controlUI.mount();
  }
  
  async waitForInit() {
    await this.initPromise;
  }
}
```

### Main Entry Point

```typescript
// src/entrypoints/content/main.ts
export async function main(ctx: ContentScriptContext) {
  const tabId = await tabIdPromise.promise;
  const service = new ContentService(ctx, tabId);
  
  // Wait for control UI to be ready
  await service.waitForInit();
  
  // Register RPC handler for communication
  registerRpcHandler("content-rpc", service);
}
```

## UI Components

Both UI types (control button and main panel) use the same React component code:

### Control Button (`RootControl`)

- Small toggle button in bottom-right corner
- Shows/hides main subtitle panel
- Changes color based on UI state

### Main Panel (`Root`)

- Subtitle viewer with dual language support
- Caption synchronization with video
- Controls for language selection, auto-scroll, resize, etc.

**Key Point:** These components are completely **mode-agnostic**. They work identically in both iframe and shadow DOM modes because they use the `getUiParams()` abstraction.

## Communication Flow

```
┌──────────────┐         RPC over          ┌─────────────────┐
│   UI Component│     browser.runtime       │  ContentService │
│  (React)      │◄──────────────────────────┤  (content/main) │
│               │                           │                 │
│ • getPageState│                           │ • getPageState()│
│ • showUI      │                           │ • showUI()      │
│ • hideUI      │                           │ • hideUI()      │
│ • togglePlay  │                           │ • togglePlay()  │
│ • seek        │                           │ • seek()        │
└───────────────┘                           └─────────────────┘
```

Communication works identically in both modes via the RPC abstraction layer.

## Trade-offs Comparison

| Aspect | Iframe Mode | Shadow DOM Mode |
|--------|------------|-----------------|
| **Isolation** | Complete (separate window context) | CSS only (same window context) |
| **Accessibility** | ❌ Not accessible to other extensions | ✅ Accessible (open shadow root) |
| **HMR Support** | ✅ Full support | ❌ No support |
| **Performance** | Slightly slower (iframe overhead) | Faster (direct DOM) |
| **Dev Experience** | ✅ Excellent (HMR) | ⚠️ Requires rebuild to see changes |
| **Prod Use Case** | Not ideal (isolation barrier) | ✅ Ideal (extensible) |
| **CSS Injection** | Via iframe HTML | Via WXT `cssInjectionMode: "ui"` |
| **Params Passing** | URL query string | Global window object |

## Benefits of Dual-Mode Architecture

1. **Optimal Developer Experience**
   - Iframe mode in development provides instant feedback via HMR
   - No compromise on dev velocity

2. **Maximum Extensibility**
   - Shadow DOM mode in production allows other extensions to:
     - Access UI elements for word-by-word translations
     - Inject custom functionality
     - Enhance the subtitle experience

3. **Code Reuse**
   - Same React components work in both modes
   - No duplication or mode-specific code in UI layer
   - Single source of truth for business logic

4. **Clean Abstraction**
   - UI Manager provides unified interface
   - ContentService doesn't need to know implementation details
   - Easy to maintain and test

5. **Type Safety**
   - Full TypeScript support throughout
   - Compile-time mode validation
   - IDE autocompletion and error checking

## File Structure

```
src/
├── entrypoints/
│   ├── content/
│   │   ├── index.ts           # Content script entry (cssInjectionMode config)
│   │   ├── main.ts            # ContentService class
│   │   └── rpc.ts             # RPC helpers
│   └── content-iframe/
│       ├── index.html         # Iframe HTML page
│       ├── main.tsx           # Entry point (uses getUiParams)
│       ├── root.tsx           # Main panel component
│       └── root-control.tsx   # Control button component
└── utils/
    ├── ui-manager.ts          # Core abstraction (111 lines)
    ├── ui-render.tsx          # Shadow DOM renderer (57 lines)
    ├── ui-params.ts           # Params bridge (19 lines)
    └── ui-manager.test.ts     # Unit tests
```

## Testing

### Unit Tests

```typescript
// ui-manager.test.ts
describe("ui-manager", () => {
  it("should return correct UI mode based on environment", () => {
    const mode = getDefaultUiMode();
    expect(mode).toMatch(/^(iframe|shadow-dom)$/);
  });
});
```

### Build Verification

```bash
# Development build (iframe mode)
$ pnpm dev
# Check: .output/chrome-mv3-dev/content-scripts/content.js contains "iframe"

# Production build (shadow DOM mode)
$ pnpm build
# Check: .output/chrome-mv3/content-scripts/content.js contains "shadow-dom"
```

### Manual Testing Checklist

- [ ] **Iframe Mode (Dev)**
  - [ ] Control button appears in bottom-right
  - [ ] Clicking shows/hides main panel
  - [ ] HMR works when editing components
  - [ ] UI isolated from page styles

- [ ] **Shadow DOM Mode (Prod)**
  - [ ] Control button appears in bottom-right
  - [ ] Clicking shows/hides main panel
  - [ ] UI elements accessible via DevTools
  - [ ] Shadow root visible in Elements tab
  - [ ] Other extensions can query UI elements

## Migration Guide

If you need to add new UI components or modify existing ones:

### Adding a New Component

1. Create component in `src/entrypoints/content-iframe/`
2. Use `getUiParams()` to read parameters
3. No other changes needed - works in both modes automatically

```typescript
import { getUiParams } from "../../utils/ui-params";

export function MyNewComponent() {
  const params = getUiParams();
  const tabId = Number(params.get("tabId"));
  // ... rest of component
}
```

### Creating a New UI Type

1. Call `createContentScriptUi()` in ContentService
2. Specify whether it's a control UI or main UI
3. Provide positioning via `onMount` callback

```typescript
const myUI = await createContentScriptUi(this.ctx, {
  mode: this.uiMode,
  tabId: this.tabId,
  isControl: false, // or true
  videoId: "abc123",
  position: "inline",
  anchor: "body",
  onMount: async (wrapper) => {
    wrapper.style.position = "fixed";
    // ... styling
  },
});
myUI.mount();
```

## Troubleshooting

### Issue: Component can't read params

**Symptom:** `uiParams.get("tabId")` returns `null`

**Solution:**
- Ensure you're using `getUiParams()` instead of direct URL reading
- In shadow DOM mode, verify `window.__YTSUB_UI_PARAMS__` is set
- Check that `renderInShadowDom()` is called before component import

### Issue: Styles not applied in shadow DOM

**Symptom:** UI appears unstyled

**Solution:**
- Verify `cssInjectionMode: "ui"` is set in `content/index.ts`
- Check that styles are imported in the component
- Ensure WXT version supports shadow DOM CSS injection

### Issue: HMR not working

**Symptom:** Changes require full reload

**Solution:**
- This is expected in shadow DOM mode
- Use `pnpm dev` to get iframe mode with HMR
- For production testing, use `pnpm build` and load unpacked extension

## Future Enhancements

Potential improvements to the architecture:

1. **Configurable Mode Override**
   ```typescript
   // Allow manual mode selection for testing
   const mode = process.env.FORCE_UI_MODE || getDefaultUiMode();
   ```

2. **Multiple Shadow Root Support**
   - Currently limited to one instance per component type
   - Could support multiple instances with unique names

3. **Hybrid Mode**
   - Use shadow DOM but with iframe fallback for certain features
   - Best of both worlds approach

4. **Performance Monitoring**
   - Track rendering performance differences
   - Optimize shadow DOM initialization

## References

- [WXT Documentation - Content Script UI](https://wxt.dev/guide/essentials/content-scripts.html#ui)
- [MDN - Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Chrome Extensions - Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

**Last Updated:** 2025-11-16  
**Version:** 1.0  
**Authors:** GitHub Copilot
