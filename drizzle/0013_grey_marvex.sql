CREATE TABLE `protectedDeliveryAuditCycles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleId` int NOT NULL,
	`cycleKey` varchar(7) NOT NULL,
	`status` enum('running','completed','failed','skipped') NOT NULL DEFAULT 'running',
	`localDeliveryAuditCount` int NOT NULL DEFAULT 0,
	`activeProductionEntitlementCount` int NOT NULL DEFAULT 0,
	`masterServerHttpStatus` int,
	`masterServerReachable` enum('yes','no') NOT NULL DEFAULT 'no',
	`masterServerResponseClass` varchar(32),
	`failureReason` text,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `protectedDeliveryAuditCycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `protectedDeliveryAuditCycles_schedule_cycle_unique` UNIQUE(`scheduleId`,`cycleKey`)
);
--> statement-breakpoint
CREATE TABLE `protectedDeliveryAuditSchedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleName` varchar(128) NOT NULL,
	`masterServerBaseUrl` varchar(512) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`enabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `protectedDeliveryAuditSchedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `protectedDeliveryAuditSchedules_scheduleName_unique` UNIQUE(`scheduleName`),
	CONSTRAINT `protectedDeliveryAuditSchedules_task_uid_unique` UNIQUE(`scheduleCronTaskUid`)
);
--> statement-breakpoint
ALTER TABLE `protectedDeliveryAuditCycles` ADD CONSTRAINT `pda_cycles_schedule_fk` FOREIGN KEY (`scheduleId`) REFERENCES `protectedDeliveryAuditSchedules`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pda_cycles_status_idx` ON `protectedDeliveryAuditCycles` (`status`);