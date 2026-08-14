import type { Express, Request, Response } from "express";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 300);
  return "The RM1 test bill could not be initialized. No payment was created.";
}

/**
 * Direct owner-session route used only by the isolated RM1 test bench.
 * It bypasses client-side tRPC batch parsing and always serializes a JSON response.
 */
export function registerRm1TestRoute(app: Express) {
  app.post("/api/owner/rm1/initiate", async (req: Request, res: Response) => {
    res.type("application/json");
    try {
      const ctx = await createContext({ req, res } as Parameters<typeof createContext>[0]);
      if (!ctx.user) return res.status(401).json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Sign in before creating the RM1 test bill." } });
      if (ctx.user.role !== "admin") return res.status(403).json({ ok: false, error: { code: "FORBIDDEN", message: "Only the owner can create the RM1 test bill." } });

      const result = await appRouter.createCaller(ctx).test.createLiveCheckout();
      return res.status(200).json({ ok: true, checkoutUrl: result.checkoutUrl });
    } catch (error) {
      console.error("[RM1 test initiation]", safeErrorMessage(error));
      return res.status(502).json({ ok: false, error: { code: "RM1_INITIATION_FAILED", message: safeErrorMessage(error) } });
    }
  });
}
