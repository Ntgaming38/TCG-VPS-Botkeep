CREATE TABLE `chyusen_notification_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`lotteryNew` int NOT NULL DEFAULT 1,
	`lotteryExpiring` int NOT NULL DEFAULT 1,
	`lotteryResult` int NOT NULL DEFAULT 1,
	`lotteryChanged` int NOT NULL DEFAULT 1,
	`lotteryWon` int NOT NULL DEFAULT 1,
	`lotteryLost` int NOT NULL DEFAULT 1,
	`deadlineHoursJson` text NOT NULL,
	`pushEnabled` int NOT NULL DEFAULT 0,
	`quietHoursEnabled` int NOT NULL DEFAULT 0,
	`quietStart` varchar(5) DEFAULT '22:00',
	`quietEnd` varchar(5) DEFAULT '08:00',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chyusen_notification_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `chyusen_notification_settings_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `chyusen_notifications` ADD `category` varchar(32) DEFAULT 'chyusen' NOT NULL;--> statement-breakpoint
ALTER TABLE `chyusen_notifications` ADD `priority` enum('low','medium','high','critical') DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE `chyusen_notifications` ADD `link` varchar(2048);--> statement-breakpoint
ALTER TABLE `chyusen_notifications` ADD `readAt` timestamp;--> statement-breakpoint
ALTER TABLE `chyusen_notifications` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `chyusen_sources` ADD `checkIntervalMinutes` int DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE `chyusen_sources` ADD `nextCheckAt` timestamp;--> statement-breakpoint
ALTER TABLE `chyusen_sources` ADD `failureCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `chyusen_sources` ADD `detectedCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `chyusen_notifications_user_category_idx` ON `chyusen_notifications` (`userId`,`category`);