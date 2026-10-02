CREATE TABLE `login_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`loginMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `login_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `avatarBorderColor` varchar(24);--> statement-breakpoint
CREATE INDEX `login_events_user_created_idx` ON `login_events` (`userId`,`createdAt`);
--> statement-breakpoint
INSERT INTO `login_events` (`userId`, `loginMethod`, `createdAt`)
SELECT `id`, `loginMethod`, `lastSignedIn`
FROM `users`
WHERE `lastSignedIn` IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `login_events` WHERE `login_events`.`userId` = `users`.`id`);
