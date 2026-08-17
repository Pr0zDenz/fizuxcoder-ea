CREATE TABLE `protectedDeliveryAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` varchar(64) NOT NULL,
	`fileId` int NOT NULL,
	`entitlementId` int NOT NULL,
	`deliveredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `protectedDeliveryAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `protectedDeliveryAudits` ADD CONSTRAINT `protectedDeliveryAudits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protectedDeliveryAudits` ADD CONSTRAINT `protectedDeliveryAudits_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protectedDeliveryAudits` ADD CONSTRAINT `protectedDeliveryAudits_fileId_productFiles_id_fk` FOREIGN KEY (`fileId`) REFERENCES `productFiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `protectedDeliveryAudits` ADD CONSTRAINT `protectedDeliveryAudits_entitlementId_entitlements_id_fk` FOREIGN KEY (`entitlementId`) REFERENCES `entitlements`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `protectedDeliveryAudits_user_product_idx` ON `protectedDeliveryAudits` (`userId`,`productId`);--> statement-breakpoint
CREATE INDEX `protectedDeliveryAudits_file_idx` ON `protectedDeliveryAudits` (`fileId`);