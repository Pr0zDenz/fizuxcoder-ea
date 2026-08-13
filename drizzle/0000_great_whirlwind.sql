CREATE TABLE `entitlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` varchar(64) NOT NULL,
	`mostRecentOrderId` varchar(64) NOT NULL,
	`status` enum('active','expired','revoked') NOT NULL DEFAULT 'active',
	`startsAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entitlements_id` PRIMARY KEY(`id`),
	CONSTRAINT `entitlements_user_product_unique` UNIQUE(`userId`,`productId`)
);
--> statement-breakpoint
CREATE TABLE `paymentOrders` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`productId` varchar(64) NOT NULL,
	`externalReference` varchar(64) NOT NULL,
	`providerBillCode` varchar(32),
	`providerRefNo` varchar(64),
	`status` enum('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
	`expectedAmountSen` int NOT NULL,
	`paidAmountSen` int,
	`failureReason` text,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `paymentOrders_id` PRIMARY KEY(`id`),
	CONSTRAINT `paymentOrders_externalReference_unique` UNIQUE(`externalReference`)
);
--> statement-breakpoint
CREATE TABLE `productFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` varchar(64) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`contentType` varchar(128) NOT NULL DEFAULT 'application/octet-stream',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `productFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`categoryCode` varchar(32) NOT NULL,
	`priceSen` int NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'MYR',
	`billingCycle` enum('lifetime','monthly') NOT NULL,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `entitlements` ADD CONSTRAINT `entitlements_mostRecentOrderId_paymentOrders_id_fk` FOREIGN KEY (`mostRecentOrderId`) REFERENCES `paymentOrders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentOrders` ADD CONSTRAINT `paymentOrders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `paymentOrders` ADD CONSTRAINT `paymentOrders_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `productFiles` ADD CONSTRAINT `productFiles_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `entitlements_user_status_idx` ON `entitlements` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `paymentOrders_user_status_idx` ON `paymentOrders` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `productFiles_product_idx` ON `productFiles` (`productId`);