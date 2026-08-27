import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const portalPath = resolve(projectRoot, "client", "src", "pages", "Portal.tsx");
const adminOperationsPath = resolve(projectRoot, "client", "src", "pages", "AdminOperations.tsx");
const commandCenterPath = resolve(projectRoot, "client", "src", "pages", "AdminCommandCenter.tsx");
const marketingStudioPath = resolve(projectRoot, "client", "src", "pages", "MarketingStudio.tsx");
const appPath = resolve(projectRoot, "client", "src", "App.tsx");
const routersPath = resolve(projectRoot, "server", "routers.ts");
const rm1RoutePath = resolve(projectRoot, "server", "rm1TestRoute.ts");

describe("customer portal administrator boundary", () => {
  it("contains no owner operations or administrator route link in the standard customer portal", () => {
    const portal = readFileSync(portalPath, "utf8");

    expect(portal).not.toContain("trpc.test.");
    expect(portal).not.toContain("trpc.admin.");
    expect(portal).not.toContain("/api/owner/rm1/initiate");
    expect(portal).not.toContain("Owner-only");
    expect(portal).not.toContain("/admin/operations");
    expect(portal).not.toContain("/admin/marketing");
    expect(portal).not.toContain("trpc.marketing.");
    expect(portal).not.toContain("dailySummary");
  });

  it("places owner operations on a separate, unlinked route with an administrator presentation gate", () => {
    const adminOperations = readFileSync(adminOperationsPath, "utf8");
    const app = readFileSync(appPath, "utf8");

    expect(adminOperations).toContain('const isAdmin = user?.role === "admin";');
    expect(adminOperations).toContain("if (!isAuthenticated)");
    expect(adminOperations).toContain("if (!isAdmin)");
    expect(adminOperations).toContain("Administrator access required");
    expect(adminOperations).toContain("trpc.test.");
    expect(adminOperations).toContain("trpc.admin.uploadPackage");
    expect(adminOperations).toContain("/api/owner/rm1/initiate");
    expect(app).toContain('<Route path="/admin/operations" component={AdminOperations} />');
  });

  it("keeps the marketing studio on its own administrator-gated route with separated manual and scheduled publishing safeguards", () => {
    const studio = readFileSync(marketingStudioPath, "utf8");
    const app = readFileSync(appPath, "utf8");
    const routers = readFileSync(routersPath, "utf8");

    expect(studio).toContain('const isAdmin = user?.role === "admin";');
    expect(studio).toContain("if (!isAuthenticated)");
    expect(studio).toContain("if (!isAdmin)");
    expect(studio).toContain("Manual approval can publish immediately. Scheduled publishing is a separate queue");
    expect(studio).toContain("The join link is intentionally held only as server configuration");
    expect(studio).toContain("Screenshot review required");
    expect(studio).toContain("Approve for schedule");
    expect(studio).toContain('href="/api/threads/oauth/start"');
    expect(studio).toContain("trpc.marketing.");
    expect(app).toContain('<Route path="/admin/marketing" component={MarketingStudio} />');
    expect(routers).toContain("marketing: router({");
    expect(routers).toContain("seedTwoWeekPilot: adminProcedure");
    expect(routers).toContain("applyGeminiBotRevision: adminProcedure");
    expect(routers).toContain("retryPublish: adminProcedure");
    expect(routers).toContain("threadsConnection: adminProcedure");
    expect(routers).toContain("automationStatus: adminProcedure");
    expect(routers).toContain("enableThreeDailyPublishing: adminProcedure");
  });

  it("keeps the midnight Telegram summary behind the command-center administrator gate", () => {
    const commandCenter = readFileSync(commandCenterPath, "utf8");
    const routers = readFileSync(routersPath, "utf8");

    expect(commandCenter).toContain('const isAdmin = user?.role === "admin";');
    expect(commandCenter).toContain("if (!isAuthenticated)");
    expect(commandCenter).toContain("if (!isAdmin)");
    expect(commandCenter).toContain("trpc.telegram.dailySummaryStatus");
    expect(commandCenter).toContain("Type ENABLE DAILY TELEGRAM SUMMARY");
    expect(routers).toContain("dailySummaryStatus: adminProcedure");
    expect(routers).toContain("enableDailySummary: adminProcedure");
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
