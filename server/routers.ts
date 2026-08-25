import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createToyyibPayBill, inspectToyyibPayCreateBill } from "./toyyibpay";
import { attachProviderBill, beginPaymentOrder, bindCustomerMt5Account, claimPermanentBillPayment, createNoChargeTestPurchase, getCatalog, getCustomerLibrary, getCustomerOrderStatus, getRequestOrigin, getSecureFileForCustomer, getTestCatalog, packageStorageKey, removePendingOrder, safeFileName } from "./paymentPortal";
import { getMasterServerPaymentCallbackUrl } from "./masterServer";
import { approveMarketingContent, listMarketingContent, markMarketingContentPosted, rejectMarketingContent, seedTwoWeekThreadsPilot } from "./marketingStudio";
import { getThreadsConnectionStatus } from "./threadsOAuth";
import { storageGetSignedUrl, storagePut } from "./storage";
import { getDb } from "./db";
import { productFiles, products } from "../drizzle/schema";

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
  test: router({
    catalog: adminProcedure.query(() => getTestCatalog()),
    simulateNoChargePurchase: adminProcedure.mutation(async ({ ctx }) => createNoChargeTestPurchase({ userId: ctx.user.id })),
    prepareLiveProduct: adminProcedure.mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is unavailable" });
      const product = {
        id: "test-gemini-bot-ea",
        name: "Gemini Bot EA — RM1 Live Test",
        description: "Owner-only end-to-end payment, entitlement, MT5 binding, and protected-download validation. No production EA package is included.",
        categoryCode: "x42sivvj",
        priceSen: 100,
        originalPriceSen: null,
        currency: "MYR",
        billingCycle: "monthly" as const,
        active: "yes" as const,
        isTest: "yes" as const,
      };
      await db.insert(products).values(product).onDuplicateKeyUpdate({
        set: {
          name: product.name,
          description: product.description,
          categoryCode: product.categoryCode,
          priceSen: product.priceSen,
          originalPriceSen: product.originalPriceSen,
          currency: product.currency,
          billingCycle: product.billingCycle,
          active: product.active,
          isTest: product.isTest,
        },
      });
      const existingFile = await db.select({ id: productFiles.id }).from(productFiles).where(eq(productFiles.productId, product.id)).limit(1);
      if (!existingFile.length) {
        const fileName = "FizuxCoder_RM1_Test_Receipt.txt";
        const content = Buffer.from("FizuxCoder RM1 live payment test\n\nThis protected test-only artifact confirms that payment verification, entitlement activation, MT5 binding, and signed delivery are working. It is not an EA package and does not grant production EA access.\n", "utf-8");
        const uploaded = await storagePut(packageStorageKey(product.id, fileName), content, "text/plain; charset=utf-8");
        await db.insert(productFiles).values({ productId: product.id, displayName: "RM1 live test receipt", fileName, storageKey: uploaded.key, contentType: "text/plain; charset=utf-8" });
      }
      return { name: product.name };
    }),
    inspectProvider: adminProcedure.query(async () => inspectToyyibPayCreateBill("x42sivvj")),
    claimPermanentRm1Fallback: adminProcedure.input(z.object({ receiptNo: z.string().min(4).max(128) })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your owner account needs an email address before a payment can be claimed" });
      return claimPermanentBillPayment({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        productId: "test-gemini-bot-ea",
        receiptNo: input.receiptNo,
        forcePermanentTestBill: true,
      });
    }),
    createLiveCheckout: adminProcedure.mutation(async ({ ctx }) => {
      if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your owner account needs an email address before creating a test bill" });
      let pending: Awaited<ReturnType<typeof beginPaymentOrder>> | undefined;
      try {
        const db = await getDb();
        if (!db) throw new Error("Database is unavailable");
        await db.update(products).set({ categoryCode: "x42sivvj" }).where(eq(products.id, "test-gemini-bot-ea"));
        const order = await beginPaymentOrder({ userId: ctx.user.id, productId: "test-gemini-bot-ea", referencePrefix: "FZTEST" });
        pending = order;
        const origin = getRequestOrigin(ctx.req);
        const billCode = await createToyyibPayBill({
          categoryCode: pending.product.categoryCode,
          billName: "FizuxCoder RM1 Test",
          billDescription: "FizuxCoder licence test",
          amountSen: pending.product.priceSen,
          returnUrl: `${origin}/portal`,
          callbackUrl: getMasterServerPaymentCallbackUrl(),
          externalReference: pending.externalReference,
          payerName: ctx.user.name ?? "FizuxCoder owner test",
          payerEmail: ctx.user.email,
          payerPhone: "0123456789",
        });
        await attachProviderBill(pending.orderId, billCode);
        return { checkoutUrl: `https://toyyibpay.com/${billCode}` };
      } catch (error) {
        if (pending) await removePendingOrder(pending.orderId);
        throw new TRPCError({ code: "BAD_GATEWAY", message: error instanceof Error ? error.message : "Unable to create the RM1 test bill" });
      }
    }),
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
    bindMt5Account: protectedProcedure.input(z.object({ productId: z.string().min(1), accountNumber: z.string().regex(/^\d{1,20}$/, "Enter a valid numeric MT5 account number") })).mutation(async ({ ctx, input }) => {
      if (!ctx.user.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Your portal account needs an email address before an MT5 account can be bound" });
      try {
        return await bindCustomerMt5Account({ userId: ctx.user.id, userEmail: ctx.user.email, userName: ctx.user.name, productId: input.productId, accountNumber: input.accountNumber });
      } catch (error) {
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to bind this MT5 account" });
      }
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
  marketing: router({
    list: adminProcedure.query(() => listMarketingContent()),
    threadsConnection: adminProcedure.query(({ ctx }) => getThreadsConnectionStatus(ctx.user.id)),
    seedTwoWeekPilot: adminProcedure.mutation(({ ctx }) => seedTwoWeekThreadsPilot(ctx.user.id)),
    approve: adminProcedure.input(z.object({ contentItemId: z.number().int().positive() })).mutation(({ ctx, input }) => approveMarketingContent({ contentItemId: input.contentItemId, actorUserId: ctx.user.id })),
    reject: adminProcedure.input(z.object({ contentItemId: z.number().int().positive(), note: z.string().max(255).optional() })).mutation(({ ctx, input }) => rejectMarketingContent({ contentItemId: input.contentItemId, actorUserId: ctx.user.id, note: input.note })),
    markManuallyPosted: adminProcedure.input(z.object({ contentItemId: z.number().int().positive(), externalPostId: z.string().max(128).optional() })).mutation(({ ctx, input }) => markMarketingContentPosted({ contentItemId: input.contentItemId, actorUserId: ctx.user.id, externalPostId: input.externalPostId })),
  }),
});

export type AppRouter = typeof appRouter;
