CREATE TABLE `marketingContentAudits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentItemId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('seeded','approved','rejected','marked_posted') NOT NULL,
	`contentHash` varchar(64) NOT NULL,
	`note` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `marketingContentAudits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketingContentItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contentKey` varchar(96) NOT NULL,
	`platform` enum('threads') NOT NULL DEFAULT 'threads',
	`title` varchar(180) NOT NULL,
	`caption` text NOT NULL,
	`language` enum('en','en_ms') NOT NULL DEFAULT 'en',
	`assetUrl` varchar(512),
	`assetAlt` text,
	`destinationUrl` varchar(512) NOT NULL,
	`riskNotice` varchar(255) NOT NULL,
	`scheduledFor` timestamp,
	`status` enum('draft','approved','posted','rejected') NOT NULL DEFAULT 'draft',
	`complianceStatus` enum('pending','passed','flagged') NOT NULL DEFAULT 'pending',
	`complianceFlags` text,
	`contentHash` varchar(64) NOT NULL,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`postedByUserId` int,
	`postedAt` timestamp,
	`externalPostId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketingContentItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketingContentItems_contentKey_unique` UNIQUE(`contentKey`)
);
--> statement-breakpoint
ALTER TABLE `marketingContentAudits` ADD CONSTRAINT `marketingContentAudits_contentItemId_marketingContentItems_id_fk` FOREIGN KEY (`contentItemId`) REFERENCES `marketingContentItems`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketingContentAudits` ADD CONSTRAINT `marketingContentAudits_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD CONSTRAINT `marketingContentItems_approvedByUserId_users_id_fk` FOREIGN KEY (`approvedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD CONSTRAINT `marketingContentItems_postedByUserId_users_id_fk` FOREIGN KEY (`postedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `marketingContentAudits_item_created_idx` ON `marketingContentAudits` (`contentItemId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketingContentAudits_actor_created_idx` ON `marketingContentAudits` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `marketingContentItems_status_scheduled_idx` ON `marketingContentItems` (`status`,`scheduledFor`);--> statement-breakpoint
CREATE INDEX `marketingContentItems_approval_idx` ON `marketingContentItems` (`approvedByUserId`,`approvedAt`);