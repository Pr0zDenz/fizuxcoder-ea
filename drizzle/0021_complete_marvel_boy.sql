CREATE TABLE `telegramSignalLifecycleUpdates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`originalSignalEventId` int NOT NULL,
	`lifecycleEventId` varchar(96) NOT NULL,
	`accountNumber` varchar(20) NOT NULL,
	`symbol` varchar(64) NOT NULL,
	`direction` enum('BUY','SELL') NOT NULL,
	`stage` enum('TP1','TP2','TP3','SL') NOT NULL,
	`hitPrice` varchar(32) NOT NULL,
	`eaDate` varchar(11) NOT NULL,
	`eaTime` varchar(8) NOT NULL,
	`status` enum('received','delivering','delivered','failed','rejected') NOT NULL DEFAULT 'received',
	`replyMessageId` varchar(64),
	`failureReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSignalLifecycleUpdates_id` PRIMARY KEY(`id`),
	CONSTRAINT `telegramSignalLifecycleUpdates_event_unique` UNIQUE(`lifecycleEventId`),
	CONSTRAINT `telegramSignalLifecycleUpdates_stage_unique` UNIQUE(`originalSignalEventId`,`stage`)
);
--> statement-breakpoint
ALTER TABLE `telegramSignalLifecycleUpdates` ADD CONSTRAINT `tslu_original_fk` FOREIGN KEY (`originalSignalEventId`) REFERENCES `telegramSignalEvents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tslu_original_created_idx` ON `telegramSignalLifecycleUpdates` (`originalSignalEventId`,`createdAt`);