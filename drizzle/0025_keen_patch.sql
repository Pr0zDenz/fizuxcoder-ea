ALTER TABLE `telegramSignalLifecycleUpdates` MODIFY COLUMN `stage` enum('TP1','TP2','TP3','SL','BASKET_CLOSED') NOT NULL;--> statement-breakpoint
ALTER TABLE `telegramSignalEvents` ADD `basketId` varchar(128);--> statement-breakpoint
ALTER TABLE `telegramSignalLifecycleUpdates` ADD `basketId` varchar(128);--> statement-breakpoint
CREATE INDEX `telegramSignalEvents_basket_idx` ON `telegramSignalEvents` (`basketId`);--> statement-breakpoint
CREATE INDEX `telegramSignalLifecycleUpdates_basket_idx` ON `telegramSignalLifecycleUpdates` (`basketId`);