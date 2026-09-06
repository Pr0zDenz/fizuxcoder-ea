ALTER TABLE `entitlements` ADD `source` enum('paid','admin_trial','test') DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE `entitlements` ADD `trialLabel` varchar(160);--> statement-breakpoint
ALTER TABLE `paymentOrders` ADD `isAdminTrial` enum('yes','no') DEFAULT 'no' NOT NULL;