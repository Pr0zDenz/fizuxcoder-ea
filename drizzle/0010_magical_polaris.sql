CREATE TABLE `threadsAuthorizations` (
	`ownerUserId` int NOT NULL,
	`threadsUserId` varchar(64) NOT NULL,
	`username` varchar(120),
	`displayName` varchar(160),
	`encryptedAccessToken` text NOT NULL,
	`grantedScopes` text NOT NULL,
	`expiresAt` timestamp,
	`authorizedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `threadsAuthorizations_ownerUserId` PRIMARY KEY(`ownerUserId`),
	CONSTRAINT `threadsAuthorizations_threadsUserId_unique` UNIQUE(`threadsUserId`)
);
--> statement-breakpoint
ALTER TABLE `threadsAuthorizations` ADD CONSTRAINT `threadsAuthorizations_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;