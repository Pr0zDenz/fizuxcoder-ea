CREATE TABLE `threeSLicenceIssuances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entitlementId` int NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`productId` varchar(64) NOT NULL,
	`licenseId` varchar(96) NOT NULL,
	`mt5AccountNumber` varchar(20) NOT NULL,
	`apiExpiresAt` timestamp,
	`activationCodeHash` varchar(64),
	`status` enum('issuing','issued','issuer_failed','delivery_failed') NOT NULL DEFAULT 'issuing',
	`providerMessageId` varchar(128),
	`failureCode` varchar(128),
	`issuedAt` timestamp,
	`emailedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threeSLicenceIssuances_id` PRIMARY KEY(`id`),
	CONSTRAINT `threeSLicenceIssuances_entitlement_unique` UNIQUE(`entitlementId`),
	CONSTRAINT `threeSLicenceIssuances_order_unique` UNIQUE(`orderId`),
	CONSTRAINT `threeSLicenceIssuances_license_unique` UNIQUE(`licenseId`)
);
--> statement-breakpoint
ALTER TABLE `threeSLicenceIssuances` ADD CONSTRAINT `threeSLicenceIssuances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threeSLicenceIssuances` ADD CONSTRAINT `threeSLicenceIssuances_entitlementId_entitlements_id_fk` FOREIGN KEY (`entitlementId`) REFERENCES `entitlements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threeSLicenceIssuances` ADD CONSTRAINT `threeSLicenceIssuances_orderId_paymentOrders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `paymentOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threeSLicenceIssuances` ADD CONSTRAINT `threeSLicenceIssuances_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `threeSLicenceIssuances_user_status_idx` ON `threeSLicenceIssuances` (`userId`,`status`);