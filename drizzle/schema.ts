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

export type Product = typeof products.$inferSelect;
export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type Entitlement = typeof entitlements.$inferSelect;
export type ProductFile = typeof productFiles.$inferSelect;
