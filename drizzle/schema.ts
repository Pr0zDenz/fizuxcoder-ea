import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const products = mysqlTable("products", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description").notNull(),
  categoryCode: varchar("categoryCode", { length: 32 }).notNull(),
  priceSen: int("priceSen").notNull(),
  originalPriceSen: int("originalPriceSen"),
  currency: varchar("currency", { length: 8 }).notNull().default("MYR"),
  billingCycle: mysqlEnum("billingCycle", ["lifetime", "monthly"]).notNull(),
  active: mysqlEnum("active", ["yes", "no"]).notNull().default("yes"),
  isTest: mysqlEnum("isTest", ["yes", "no"]).notNull().default("no"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const paymentOrders = mysqlTable("paymentOrders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id),
  externalReference: varchar("externalReference", { length: 64 }).notNull(),
  providerBillCode: varchar("providerBillCode", { length: 32 }),
  providerRefNo: varchar("providerRefNo", { length: 64 }),
  status: mysqlEnum("status", ["pending", "paid", "failed", "expired"]).notNull().default("pending"),
  expectedAmountSen: int("expectedAmountSen").notNull(),
  paidAmountSen: int("paidAmountSen"),
  failureReason: text("failureReason"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("paymentOrders_externalReference_unique").on(table.externalReference),
  uniqueIndex("paymentOrders_providerRefNo_unique").on(table.providerRefNo),
  index("paymentOrders_user_status_idx").on(table.userId, table.status),
]);

export const entitlements = mysqlTable("entitlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id),
  mostRecentOrderId: varchar("mostRecentOrderId", { length: 64 }).notNull().references(() => paymentOrders.id),
  status: mysqlEnum("status", ["active", "expired", "revoked"]).notNull().default("active"),
  startsAt: timestamp("startsAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  mt5AccountNumber: varchar("mt5AccountNumber", { length: 20 }),
  mt5BoundAt: timestamp("mt5BoundAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("entitlements_user_product_unique").on(table.userId, table.productId),
  index("entitlements_user_status_idx").on(table.userId, table.status),
]);

export const productFiles = mysqlTable("productFiles", {
  id: int("id").autoincrement().primaryKey(),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  contentType: varchar("contentType", { length: 128 }).notNull().default("application/octet-stream"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("productFiles_product_idx").on(table.productId),
]);

export const protectedDeliveryAudits = mysqlTable("protectedDeliveryAudits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id),
  fileId: int("fileId").notNull().references(() => productFiles.id),
  entitlementId: int("entitlementId").notNull().references(() => entitlements.id),
  deliveredAt: timestamp("deliveredAt").defaultNow().notNull(),
}, table => [
  index("protectedDeliveryAudits_user_product_idx").on(table.userId, table.productId),
  index("protectedDeliveryAudits_file_idx").on(table.fileId),
]);

/**
 * One server-side authorization record for the administrator-owned Gmail
 * mailbox. The refresh token is encrypted before persistence and is never
 * exposed through tRPC or browser responses.
 */
export const gmailAuthorizations = mysqlTable("gmailAuthorizations", {
  senderEmail: varchar("senderEmail", { length: 320 }).primaryKey(),
  encryptedRefreshToken: text("encryptedRefreshToken").notNull(),
  grantedScopes: text("grantedScopes"),
  authorizedAt: timestamp("authorizedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Delivery outcomes for activation emails. The unique order/type key makes a
 * successful automatic send idempotent even if a customer repeats a request.
 */
export const buyerEmailDeliveries = mysqlTable("buyerEmailDeliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: varchar("orderId", { length: 64 }).notNull().references(() => paymentOrders.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  emailType: mysqlEnum("emailType", ["activation"]).notNull().default("activation"),
  status: mysqlEnum("status", ["sent", "failed"]).notNull(),
  providerMessageId: varchar("providerMessageId", { length: 128 }),
  failureCode: varchar("failureCode", { length: 128 }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("buyerEmailDeliveries_order_type_unique").on(table.orderId, table.emailType),
  index("buyerEmailDeliveries_user_status_idx").on(table.userId, table.status),
]);

/**
 * Safe audit state for a 3S one-time Master Server activation credential. The
 * activation code itself is never persisted here: only its SHA-256 hash and
 * the delivery outcome are retained for support and duplicate prevention.
 */
export const threeSLicenceIssuances = mysqlTable("threeSLicenceIssuances", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  entitlementId: int("entitlementId").notNull().references(() => entitlements.id, { onDelete: "cascade" }),
  orderId: varchar("orderId", { length: 64 }).notNull().references(() => paymentOrders.id, { onDelete: "cascade" }),
  productId: varchar("productId", { length: 64 }).notNull().references(() => products.id),
  licenseId: varchar("licenseId", { length: 96 }).notNull(),
  mt5AccountNumber: varchar("mt5AccountNumber", { length: 20 }).notNull(),
  apiExpiresAt: timestamp("apiExpiresAt"),
  activationCodeHash: varchar("activationCodeHash", { length: 64 }),
  status: mysqlEnum("status", ["issuing", "issued", "issuer_failed", "delivery_failed"]).notNull().default("issuing"),
  providerMessageId: varchar("providerMessageId", { length: 128 }),
  failureCode: varchar("failureCode", { length: 128 }),
  issuedAt: timestamp("issuedAt"),
  emailedAt: timestamp("emailedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("threeSLicenceIssuances_entitlement_unique").on(table.entitlementId),
  uniqueIndex("threeSLicenceIssuances_order_unique").on(table.orderId),
  uniqueIndex("threeSLicenceIssuances_license_unique").on(table.licenseId),
  index("threeSLicenceIssuances_user_status_idx").on(table.userId, table.status),
]);

/**
 * Private, administrator-owned organic social drafts. These records intentionally
 * contain no social credentials, automated-publish state, advertising budget, or
 * campaign activation capability. A Threads post is marked posted only after an
 * administrator has first approved its exact persisted content.
 */
export const marketingContentItems = mysqlTable("marketingContentItems", {
  id: int("id").autoincrement().primaryKey(),
  contentKey: varchar("contentKey", { length: 96 }).notNull(),
  platform: mysqlEnum("platform", ["threads"]).notNull().default("threads"),
  title: varchar("title", { length: 180 }).notNull(),
  caption: text("caption").notNull(),
  language: mysqlEnum("language", ["en", "en_ms"]).notNull().default("en"),
  assetUrl: varchar("assetUrl", { length: 512 }),
  assetAlt: text("assetAlt"),
  destinationUrl: varchar("destinationUrl", { length: 512 }).notNull(),
  riskNotice: varchar("riskNotice", { length: 255 }).notNull(),
  scheduledFor: timestamp("scheduledFor"),
  status: mysqlEnum("status", ["draft", "approved", "posted", "rejected"]).notNull().default("draft"),
  complianceStatus: mysqlEnum("complianceStatus", ["pending", "passed", "flagged"]).notNull().default("pending"),
  complianceFlags: text("complianceFlags"),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  approvedByUserId: int("approvedByUserId").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approvedAt"),
  postedByUserId: int("postedByUserId").references(() => users.id, { onDelete: "set null" }),
  postedAt: timestamp("postedAt"),
  externalPostId: varchar("externalPostId", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("marketingContentItems_contentKey_unique").on(table.contentKey),
  index("marketingContentItems_status_scheduled_idx").on(table.status, table.scheduledFor),
  index("marketingContentItems_approval_idx").on(table.approvedByUserId, table.approvedAt),
]);

/**
 * Append-only action metadata for draft approvals and manual-post attestations.
 * It stores the approved content hash, never an external account credential.
 */
export const marketingContentAudits = mysqlTable("marketingContentAudits", {
  id: int("id").autoincrement().primaryKey(),
  contentItemId: int("contentItemId").notNull().references(() => marketingContentItems.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: mysqlEnum("action", ["seeded", "approved", "rejected", "marked_posted"]).notNull(),
  contentHash: varchar("contentHash", { length: 64 }).notNull(),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  index("marketingContentAudits_item_created_idx").on(table.contentItemId, table.createdAt),
  index("marketingContentAudits_actor_created_idx").on(table.actorUserId, table.createdAt),
]);

export type Product = typeof products.$inferSelect;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type ProductFile = typeof productFiles.$inferSelect;
export type ProtectedDeliveryAudit = typeof protectedDeliveryAudits.$inferSelect;
export type GmailAuthorization = typeof gmailAuthorizations.$inferSelect;
export type BuyerEmailDelivery = typeof buyerEmailDeliveries.$inferSelect;
export type ThreeSLicenceIssuance = typeof threeSLicenceIssuances.$inferSelect;
export type MarketingContentItem = typeof marketingContentItems.$inferSelect;
export type MarketingContentAudit = typeof marketingContentAudits.$inferSelect;
