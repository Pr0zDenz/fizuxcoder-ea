CREATE TABLE `telegramPerformanceReportRuns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(48) NOT NULL,
	`reportType` enum('daily','weekly') NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`status` enum('running','delivered','failed','skipped') NOT NULL DEFAULT 'running',
	`winCount` int NOT NULL DEFAULT 0,
	`lossCount` int NOT NULL DEFAULT 0,
	`totalPips` varchar(32) NOT NULL DEFAULT '0',
	`currentWinStreak` int NOT NULL DEFAULT 0,
	`messageHash` varchar(64),
	`telegramMessageId` varchar(64),
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `telegramPerformanceReportRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `tg_performance_report_period_unique` UNIQUE(`reportType`,`periodStart`,`periodEnd`)
);
--> statement-breakpoint
ALTER TABLE `telegramDailySummarySettings` ADD `dailyPerformanceCronExpression` varchar(64) DEFAULT '0 59 15 * * *' NOT NULL;--> statement-breakpoint
ALTER TABLE `telegramDailySummarySettings` ADD `dailyPerformanceScheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `telegramDailySummarySettings` ADD `weeklyPerformanceCronExpression` varchar(64) DEFAULT '0 0 1 * * 1' NOT NULL;--> statement-breakpoint
ALTER TABLE `telegramDailySummarySettings` ADD `weeklyPerformanceScheduleCronTaskUid` varchar(65);--> statement-breakpoint
ALTER TABLE `telegramPerformanceReportRuns` ADD CONSTRAINT `tg_perf_runs_setting_fk` FOREIGN KEY (`settingKey`) REFERENCES `telegramDailySummarySettings`(`settingKey`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tg_performance_report_setting_created_idx` ON `telegramPerformanceReportRuns` (`settingKey`,`createdAt`);