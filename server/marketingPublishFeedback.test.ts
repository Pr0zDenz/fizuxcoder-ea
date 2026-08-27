import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(new URL("../client/src/pages/MarketingStudio.tsx", import.meta.url), "utf8");

describe("marketing publish feedback contract", () => {
  it("shows immediate in-progress feedback before the provider responds", () => {
    expect(studioSource).toContain("onMutate: variables => setMessage(`Publishing draft #${variables.contentItemId} to Threads. Keep this page open while the provider confirms the post.`)");
    expect(studioSource).toContain("approve.isPending ? \"Publishing\" : \"Approve & publish\"");
  });

  it("renders explicit success and failure outcomes", () => {
    expect(studioSource).toContain("Approved and published to Threads");
    expect(studioSource).toContain("Threads publication failed: ${error.message}");
    expect(studioSource).toContain("Publication failed:");
  });

  it("keeps retry and server-pending states visible", () => {
    expect(studioSource).toContain("Retrying Threads publication for draft #${variables.contentItemId}. Keep this page open");
    expect(studioSource).toContain("retryPublish.isPending ? \"Retrying\" : \"Retry publish\"");
    expect(studioSource).toContain("item.status === \"publish_pending\"");
    expect(studioSource).toContain("The result appears after provider confirmation.");
  });

  it("reports the fresh-copy replenishment result after publication", () => {
    expect(studioSource).toContain("Fresh draft #${result.replenishment.contentItemId} is ready for review.");
    expect(studioSource).toContain("No duplicate replenishment draft was created.");
  });

  it("explains that superseded archive records are not provider rejections", () => {
    expect(studioSource).toContain("archived / superseded");
    expect(studioSource).toContain("This is not a Threads provider rejection.");
    expect(studioSource).toContain("superseded_by_gemini_20_day_campaign");
  });

  it("does not remove the exact-content, one-image publication wording", () => {
    expect(studioSource).toContain("Manual “Approve & publish” remains an immediate action for one exact stored item.");
    expect(studioSource).toContain("One supplied image is retained for review before posting.");
    expect(studioSource).toContain("This item will publish as text-only.");
  });
});
