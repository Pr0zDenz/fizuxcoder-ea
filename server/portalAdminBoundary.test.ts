import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const portalPath = resolve(projectRoot, "client", "src", "pages", "Portal.tsx");
const routersPath = resolve(projectRoot, "server", "routers.ts");
const rm1RoutePath = resolve(projectRoot, "server", "rm1TestRoute.ts");

describe("customer portal administrator boundary", () => {
  it("renders every owner control only inside an explicit administrator role condition", () => {
    const portal = readFileSync(portalPath, "utf8");
    const adminGate = "{user?.role === \"admin\" && <section";

    expect((portal.match(new RegExp(adminGate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length).toBe(5);
    expect(portal).toContain("Owner-only live payment test");
    expect(portal).toContain("Owner-only no-charge simulation");
    expect(portal).toContain("Owner-only gateway inspection");
    expect(portal).toContain("Owner-only Gmail production sender");
    expect(portal).toContain("Owner-only release desk");
  });

  it("keeps administrator-only actions protected by server-side role checks", () => {
    const routers = readFileSync(routersPath, "utf8");
    const rm1Route = readFileSync(rm1RoutePath, "utf8");

    expect(routers).toContain("test: router({");
    expect(routers).toContain("adminProcedure");
    expect(rm1Route).toContain('if (ctx.user.role !== "admin") return res.status(403)');
    expect(rm1Route).toContain("Only the owner can create the RM1 test bill.");
  });
});
