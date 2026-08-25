ALTER TABLE `marketingContentAudits` MODIFY COLUMN `action` enum('seeded','revised','approved','publish_started','published','publish_failed','rejected','marked_posted') NOT NULL;--> statement-breakpoint
ALTER TABLE `marketingContentItems` MODIFY COLUMN `status` enum('draft','approved','publish_pending','publish_failed','posted','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD `publishAttemptKey` varchar(64);--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD `publishAttemptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD `publishErrorCode` varchar(64);--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD `publishErrorMessage` varchar(255);--> statement-breakpoint
ALTER TABLE `marketingContentItems` ADD CONSTRAINT `marketingContentItems_publish_attempt_key_unique` UNIQUE(`publishAttemptKey`);