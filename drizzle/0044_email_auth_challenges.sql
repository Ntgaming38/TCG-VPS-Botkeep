CREATE TABLE `email_auth_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`purpose` enum('registration','password_reset') NOT NULL,
	`codeHash` varchar(64) NOT NULL,
	`name` varchar(100),
	`passwordHash` varchar(255),
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_auth_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_auth_challenges_email_purpose_unique` UNIQUE(`email`,`purpose`)
);
--> statement-breakpoint
CREATE INDEX `email_auth_challenges_expiry_idx` ON `email_auth_challenges` (`expiresAt`);