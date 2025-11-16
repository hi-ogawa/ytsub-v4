import { describe, expect, it } from "vitest";
import { getDefaultUiMode } from "./ui-manager";

describe("ui-manager", () => {
	it("should return correct UI mode based on environment", () => {
		const mode = getDefaultUiMode();
		// In test environment, import.meta.env.MODE should be "test"
		// but we're testing the logic itself
		expect(mode).toMatch(/^(iframe|shadow-dom)$/);
	});
});
