import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studioSource = readFileSync(new URL("../client/src/pages/MarketingStudio.tsx", import.meta.url), "utf8");

describe("marketing publish feedback contract", () => {
  it("shows immediate in-progress feedback before the provider responds", () => {
    expect(studioSource).toContain("onMutate: variables => { setMessage(`Publishing draft #${variables.contentItemId} to Threads… keep this page open while the provider confirms the post.`); }");
    expect(studioSource).toContain("approve.isPending ? \"Publishing…\" : \"Approve & publish\"");
  });

  it("renders explicit success and failure outcomes", () => {
    expect(studioSource).toContain("Approved and published to Threads");
    expect(studioSource).toContain("Threads publication failed: ${error.message}");
    expect(studioSource).toContain("Automatic publication failed:");
  });

  it("keeps retry and server-pending states visible", () => {
    expect(studioSource).toContain("Retrying Threads publication for draft #${variables.contentItemId}");
    expect(studioSource).toContain("Retrying…");
    expect(studioSource).toContain("item.status === \"publish_pending\"");
    expect(studioSource).toContain("the result will appear here when the provider confirms or rejects the post.");
  });

  it("reports the fresh-copy replenishment result after publication", () => {
    expect(studioSource).toContain("Fresh draft #${result.replenishment.contentItemId} queued for review.");
    expect(studioSource).toContain("No duplicate fresh draft was created.");
  });

  it("explains that superseded archive records are not provider rejections", () => {
    expect(studioSource).toContain("Archived / superseded");
    expect(studioSource).toContain("archived / superseded");
    expect(studioSource).toContain("This is not a Threads provider rejection.");
    expect(studioSource).toContain("superseded_by_gemini_20_day_campaign");
  });

  it("does not remove the exact-content, one-image publication wording", () => {
    expect(studioSource).toContain("Approval is the publish command for that exact stored caption, destination, and optional single image.");
    expect(studioSource).toContain("One supplied image will be attached when this item is published.");
    expect(studioSource).toContain("This item will publish as text-only.");
  });
});
