import type { Express, Request, Response } from "express";
import { callbackAmountToSen, type ToyyibPayCallback, verifyToyyibPayCallback } from "./toyyibpay";
import { recordPaymentCallback } from "./paymentPortal";

function asCallback(body: unknown): ToyyibPayCallback {
  return (body && typeof body === "object" ? body : {}) as ToyyibPayCallback;
}

export function registerToyyibPayCallback(app: Express) {
  app.post("/api/toyyibpay/callback", async (req: Request, res: Response) => {
    const callback = asCallback(req.body);
    if (!verifyToyyibPayCallback(callback)) {
      res.status(400).json({ ok: false, error: "Invalid ToyyibPay callback signature" });
      return;
    }

    try {
      const result = await recordPaymentCallback({
        externalReference: callback.order_id!,
        billCode: callback.billcode,
        refNo: callback.refno!,
        status: callback.status!,
        amountSen: callbackAmountToSen(callback.amount),
        reason: callback.reason,
      });
      res.status(result.accepted ? 200 : 409).json({ ok: result.accepted });
    } catch (error) {
      console.error("[ToyyibPay callback]", error);
      res.status(500).json({ ok: false, error: "Callback processing failed" });
    }
  });
}
