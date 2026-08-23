import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isCustomerLibraryProductVisible } from "./paymentPortal";

const paymentPortalSource = readFileSync(resolve(import.meta.dirname, "paymentPortal.ts"), "utf8");

describe("customer library test-product visibility", () => {
  it("hides test-only entitlements while retaining real product visibility", () => {
    expect(isCustomerLibraryProductVisible({ isTest: "yes" })).toBe(false);
    expect(isCustomerLibraryProductVisible({ isTest: "no" })).toBe(true);
  });

  it("enforces the test filter in both the database query and defence-in-depth mapping", () => {
    expect(paymentPortalSource).toContain('eq(products.isTest, "no")');
    expect(paymentPortalSource).toContain("rows.filter(({ product }) => isCustomerLibraryProductVisible(product))");
    expect(paymentPortalSource).toContain("Test products are retained for administrators and audit history");
  });
});
