ALTER TABLE `telegramPerformanceReportRuns` DROP INDEX `tg_performance_report_period_unique`;--> statement-breakpoint
ALTER TABLE `telegramPerformanceReportRuns` ADD `revision` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `telegramPerformanceReportRuns` ADD CONSTRAINT `tg_performance_report_period_revision_unique` UNIQUE(`reportType`,`periodStart`,`periodEnd`,`revision`);