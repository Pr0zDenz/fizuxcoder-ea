import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createToyyibPayBill } from "./toyyibpay";
import { attachProviderBill, beginPaymentOrder, claimPermanentBillPayment, getCatalog, getCustomerLibrary, getCustomerOrderStatus, getSecureFileForCustomer, packageStorageKey, removePendingOrder, safeFileName } from "./paymentPortal";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getDb } from "./db";
import { productFiles } from "../drizzle/schema";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  catalog: router({
    list: publicProcedure.query(() => getCatalog()),
  }),
  checkout: router({
    createBill: protectedProcedure.input(z.object({ productId: z.string().min(1), phone: z.string().max(30).optional() })).mutation(async ({ ctx, input }) => {
      const customerEmail = ctx.user.email;
      if (!customerEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Your account needs an email address before checkout can begin" });
      const pending = await beginPaymentOrder({ userId: ctx.user.id, productId: input.productId });
      try {
        const protocol = typeof ctx.req.headers["x-forwarded-proto"] === "string" ? ctx.req.headers["x-forwarded-proto"].split(",")[0] : ctx.req.protocol;
        const host = ctx.req.get("x-forwarded-host") ?? ctx.req.get("host");
        if (!host || host.includes("localhost")) throw new Error("Checkout must be started from a public website address");
        const origin = `${protocol}://${host}`;
        const billCode = await createToyyibPayBill({
          categoryCode: pending.product.categoryCode,
          billName: pending.product.name,
          billDescription: pending.product.description,
          amountSen: pending.product.priceSen,
          returnUrl: `${origin}/portal?order=${encodeURIComponent(pending.externalReference)}`,
          callbackUrl: `${origin}/api/toyyibpay/callback`,
          externalReference: pending.externalReference,
          payerName: ctx.user.name ?? "FizuxCoder customer",
          payerEmail: customerEmail,
          payerPhone: input.phone,
        });
        await attachProviderBill(pending.orderId, billCode);
        return { checkoutUrl: `https://toyyibpay.com/${billCode}`, externalReference: pending.externalReference };
      } catch (error) {
        await removePendingOrder(pending.orderId);
        throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Unable to start ToyyibPay checkout" });
      }
    }),
  }),
  portal: router({
    library: protectedProcedure.query(({ ctx }) => getCustomerLibrary(ctx.user.id)),
    orderStatus: protectedProcedure.input(z.object({ externalReference: z.string().min(5).max(64) })).query(({ ctx, input }) => getCustomerOrderStatus(ctx.user.id, input.externalReference)),
    claimPurchase: protectedProcedure.input(z.object({ productId: z.string().min(1), receiptNo: z.string().min(4).max(128) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your portal account needs an email address before a payment can be claimed" });
      return claimPermanentBillPayment({ userId: ctx.user.id, userEmail: ctx.user.email, productId: input.productId, receiptNo: input.receiptNo });
    }),
    download: protectedProcedure.input(z.object({ fileId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const file = await getSecureFileForCustomer({ userId: ctx.user.id, fileId: input.fileId });
      return { url: await storageGetSignedUrl(file.storageKey), fileName: file.fileName };
    }),
  }),
  admin: router({
    uploadPackage: adminProcedure.input(z.object({ productId: z.string().min(1), displayName: z.string().min(1).max(255), fileName: z.string().min(1).max(255), base64: z.string().min(1) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable" });
      const data = Buffer.from(input.base64, "base64");
      if (!data.length || data.length > 45 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Package files must be smaller than 45MB" });
      const fileName = safeFileName(input.fileName);
      const uploaded = await storagePut(packageStorageKey(input.productId, fileName), data, "application/octet-stream");
      await db.insert(productFiles).values({ productId: input.productId, displayName: input.displayName, fileName, storageKey: uploaded.key, contentType: "application/octet-stream" });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
