CREATE TABLE `threadsMarketingAutomationAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(48) NOT NULL,
	`actorUserId` int,
	`contentItemId` int,
	`action` enum('settings_updated','schedule_created','schedule_paused','schedule_resumed','run_skipped','run_started','run_published','run_failed') NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `threadsMarketingAutomationAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `threadsMarketingAutomationSettings` (
	`settingKey` varchar(48) NOT NULL,
	`ownerUserId` int NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 30 1,6,12 * * *',
	`automaticPublishingEnabled` enum('yes','no') NOT NULL DEFAULT 'no',
	`killSwitchEngaged` enum('yes','no') NOT NULL DEFAULT 'yes',
	`inviteLinkConfigured` enum('yes','no') NOT NULL DEFAULT 'no',
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threadsMarketingAutomationSettings_settingKey` PRIMARY KEY(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD `automationEligible` enum('yes','no') DEFAULT 'no' NOT NULL;--> statement-breakpoint
ALTER TABLE `threadsMarketingAutomationAudits` ADD CONSTRAINT `thr_mkt_auto_audit_setting_fk` FOREIGN KEY (`settingKey`) REFERENCES `threadsMarketingAutomationSettings`(`settingKey`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threadsMarketingAutomationAudits` ADD CONSTRAINT `thr_mkt_auto_audit_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threadsMarketingAutomationAudits` ADD CONSTRAINT `thr_mkt_auto_audit_item_fk` FOREIGN KEY (`contentItemId`) REFERENCES `marketingContentItems`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `threadsMarketingAutomationSettings` ADD CONSTRAINT `thr_mkt_auto_settings_owner_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `thr_mkt_auto_audit_setting_created_idx` ON `threadsMarketingAutomationAudits` (`settingKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `thr_mkt_auto_audit_content_created_idx` ON `threadsMarketingAutomationAudits` (`contentItemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `thr_mkt_auto_owner_idx` ON `threadsMarketingAutomationSettings` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `thr_mkt_auto_task_uid_idx` ON `threadsMarketingAutomationSettings` (`scheduleCronTaskUid`);
