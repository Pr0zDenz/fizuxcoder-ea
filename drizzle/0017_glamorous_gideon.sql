CREATE TABLE `telegramSignalSettingsAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(32) NOT NULL,
	`actorUserId` int,
	`automaticDeliveryEnabled` enum('yes','no') NOT NULL,
	`killSwitchEngaged` enum('yes','no') NOT NULL,
	`note` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegramSignalSettingsAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `telegramSignalSettingsAudits` ADD CONSTRAINT `telegramSignalSettingsAudits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `telegramSignalSettingsAudits_setting_created_idx` ON `telegramSignalSettingsAudits` (`settingKey`,`createdAt`);