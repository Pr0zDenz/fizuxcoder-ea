CREATE TABLE `telegramSignalSourceAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`accountNumber` varchar(20) NOT NULL,
	`action` enum('authorized','enabled','disabled') NOT NULL,
	`label` varchar(120) NOT NULL,
	`actorUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegramSignalSourceAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegramSignalSources` (
	`accountNumber` varchar(20) NOT NULL,
	`label` varchar(120) NOT NULL,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`addedByUserId` int,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegramSignalSources_accountNumber` PRIMARY KEY(`accountNumber`)
);
--> statement-breakpoint
ALTER TABLE `telegramSignalSourceAudits` ADD CONSTRAINT `telegramSignalSourceAudits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramSignalSources` ADD CONSTRAINT `telegramSignalSources_addedByUserId_users_id_fk` FOREIGN KEY (`addedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegramSignalSources` ADD CONSTRAINT `telegramSignalSources_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `telegramSignalSourceAudits_account_created_idx` ON `telegramSignalSourceAudits` (`accountNumber`,`createdAt`);