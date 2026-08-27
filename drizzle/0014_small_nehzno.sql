CREATE TABLE `telegramSignalAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signalEventId` int NOT NULL,
	`action` enum('received','validated','suppressed','delivery_started','delivered','failed','rejected','settings_changed','test_requested') NOT NULL,
	`actorUserId` int,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegramSignalAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegramSignalEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(96) NOT NULL,
	`eventType` enum('setup','take_profit') NOT NULL DEFAULT 'setup',
	`accountNumber` varchar(20) NOT NULL,
	`symbol` varchar(64) NOT NULL,
	`direction` enum('BUY','SELL') NOT NULL,
	`entryPrice` varchar(32) NOT NULL,
	`takeProfit` varchar(32),
	`stopLoss` varchar(32),
	`riskNote` varchar(255) NOT NULL,
	`sourceScreenshotUrl` varchar(512),
	`messageText` text NOT NULL,
	`status` enum('received','suppressed','delivering','delivered','failed','rejected') NOT NULL DEFAULT 'received',
	`deliveryAttemptKey` varchar(64),
	`telegramMessageId` varchar(64),
	`failureCode` varchar(64),
	`failureReason` varchar(255),
	`occurredAt` timestamp,
	`deliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSignalEvents_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegramSignalEvents_event_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `telegramSignalSettings` (
	`settingKey` varchar(32) NOT NULL,
	`channelId` varchar(64),
	`channelLabel` varchar(160),
	`automaticDeliveryEnabled` enum('yes','no') NOT NULL DEFAULT 'no',
	`killSwitchEngaged` enum('yes','no') NOT NULL DEFAULT 'yes',
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSignalSettings_settingKey` PRIMARY KEY(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `telegramSignalAudits` ADD CONSTRAINT `telegramSignalAudits_signalEventId_telegramSignalEvents_id_fk` FOREIGN KEY (`signalEventId`) REFERENCES `telegramSignalEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramSignalAudits` ADD CONSTRAINT `telegramSignalAudits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramSignalSettings` ADD CONSTRAINT `telegramSignalSettings_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `telegramSignalAudits_event_created_idx` ON `telegramSignalAudits` (`signalEventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `telegramSignalEvents_status_created_idx` ON `telegramSignalEvents` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `telegramSignalEvents_account_created_idx` ON `telegramSignalEvents` (`accountNumber`,`createdAt`);