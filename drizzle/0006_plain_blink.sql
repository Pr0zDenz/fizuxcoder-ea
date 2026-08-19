CREATE TABLE `gmailAuthorizations` (
	`senderEmail` varchar(320) NOT NULL,
	`encryptedRefreshToken` text NOT NULL,
	`grantedScopes` text,
	`authorizedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gmailAuthorizations_senderEmail` PRIMARY KEY(`senderEmail`)
);
