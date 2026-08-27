CREATE TABLE `telegramDailySummaryAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(48) NOT NULL,
	`runId` int,
	`actorUserId` int,
	`action` enum('settings_updated','schedule_created','schedule_paused','schedule_resumed','run_started','run_delivered','run_skipped','run_failed') NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegramDailySummaryAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegramDailySummaryRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(48) NOT NULL,
	`summaryDate` varchar(10) NOT NULL,
	`status` enum('running','delivered','failed','skipped') NOT NULL DEFAULT 'running',
	`setupCount` int NOT NULL DEFAULT 0,
	`takeProfitCount` int NOT NULL DEFAULT 0,
	`stopLossCount` int NOT NULL DEFAULT 0,
	`messageHash` varchar(64),
	`telegramMessageId` varchar(64),
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `telegramDailySummaryRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `tg_daily_summary_runs_date_unique` UNIQUE(`summaryDate`)
);
--> statement-breakpoint
CREATE TABLE `telegramDailySummarySettings` (
	`settingKey` varchar(48) NOT NULL,
	`ownerUserId` int NOT NULL,
	`timezone` varchar(64) NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
	`cronExpression` varchar(64) NOT NULL DEFAULT '0 0 16 * * *',
	`automaticDeliveryEnabled` enum('yes','no') NOT NULL DEFAULT 'no',
	`killSwitchEngaged` enum('yes','no') NOT NULL DEFAULT 'yes',
	`sendWhenNoSignals` enum('yes','no') NOT NULL DEFAULT 'no',
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramDailySummarySettings_settingKey` PRIMARY KEY(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `telegramDailySummaryAudits` ADD CONSTRAINT `tg_daily_sum_audit_settings_fk` FOREIGN KEY (`settingKey`) REFERENCES `telegramDailySummarySettings`(`settingKey`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramDailySummaryAudits` ADD CONSTRAINT `tg_daily_sum_audit_run_fk` FOREIGN KEY (`runId`) REFERENCES `telegramDailySummaryRuns`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramDailySummaryAudits` ADD CONSTRAINT `tg_daily_sum_audit_actor_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramDailySummaryRuns` ADD CONSTRAINT `tg_daily_sum_runs_settings_fk` FOREIGN KEY (`settingKey`) REFERENCES `telegramDailySummarySettings`(`settingKey`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramDailySummarySettings` ADD CONSTRAINT `tg_daily_sum_settings_owner_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tg_daily_summary_audit_setting_created_idx` ON `telegramDailySummaryAudits` (`settingKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tg_daily_summary_audit_run_created_idx` ON `telegramDailySummaryAudits` (`runId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tg_daily_summary_runs_setting_created_idx` ON `telegramDailySummaryRuns` (`settingKey`,`createdAt`);--> statement-breakpoint
CREATE INDEX `tg_daily_summary_owner_idx` ON `telegramDailySummarySettings` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `tg_daily_summary_task_uid_idx` ON `telegramDailySummarySettings` (`scheduleCronTaskUid`);
