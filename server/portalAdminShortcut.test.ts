import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const portalSource = await readFile(new URL("../client/src/pages/Portal.tsx", import.meta.url), "utf8");

describe("customer portal admin shortcut", () => {
  it("keeps the shortcut behind the authenticated admin role gate", () => {
    expect(portalSource).toContain("{isAuthenticated ? (");
    expect(portalSource).toContain('user?.role === "admin"');
    expect(portalSource).toContain('href="/admin"');
    expect(portalSource).toContain('data-testid="admin-centre-shortcut"');
    expect(portalSource).not.toContain('href="https://admin.');
  });

  it("leaves standard-customer navigation without an admin shortcut branch", () => {
    const adminBranch = portalSource.match(/\{user\?\.role === "admin" &&([\s\S]*?)\}/)?.[0] ?? "";
    expect(adminBranch).toContain("admin-centre-shortcut");
    expect(adminBranch).toContain('href="/admin"');
  });
});
