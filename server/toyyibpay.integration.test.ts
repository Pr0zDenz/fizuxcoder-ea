import { describe, expect, it } from "vitest";
import { getToyyibPayCategory } from "./toyyibpay";

describe("ToyyibPay credential integration", () => {
  it("validates the server-side key against the active 3S Universal category without creating a bill", async () => {
    const category = await getToyyibPayCategory("o4ybe3cc");

    expect(category.categoryStatus).toBe("1");
  }, 30_000);

  it("validates the server-side key against the active Gemini category without creating a bill", async () => {
    const category = await getToyyibPayCategory("x42sivvj");

    expect(category.categoryStatus).toBe("1");
  }, 30_000);
});
