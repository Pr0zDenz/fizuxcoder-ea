CREATE TABLE `buyerEmailDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`productId` varchar(64) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`emailType` enum('activation') NOT NULL DEFAULT 'activation',
	`status` enum('sent','failed') NOT NULL,
	`providerMessageId` varchar(128),
	`failureCode` varchar(128),
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `buyerEmailDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `buyerEmailDeliveries_order_type_unique` UNIQUE(`orderId`,`emailType`)
);
--> statement-breakpoint
ALTER TABLE `buyerEmailDeliveries` ADD CONSTRAINT `buyerEmailDeliveries_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buyerEmailDeliveries` ADD CONSTRAINT `buyerEmailDeliveries_orderId_paymentOrders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `paymentOrders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `buyerEmailDeliveries` ADD CONSTRAINT `buyerEmailDeliveries_productId_products_id_fk` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `buyerEmailDeliveries_user_status_idx` ON `buyerEmailDeliveries` (`userId`,`status`);