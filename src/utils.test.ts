import { expect, test } from "vitest";
import { fetchMetadataJson, parseVideoId } from "./utils";

test("basic", async () => {
	const videoId = parseVideoId("https://www.youtube.com/watch?v=pTycfmVzdl8");
	expect(videoId).toMatchInlineSnapshot(`"pTycfmVzdl8"`);

	if (1) return;

	const result = await fetchMetadataJson("pTycfmVzdl8");
	expect(result.playabilityStatus.status).toMatchInlineSnapshot(`"OK"`);
});
