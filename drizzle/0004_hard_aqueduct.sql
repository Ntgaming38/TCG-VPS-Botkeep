CREATE TABLE `chyusen_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`productName` varchar(255) NOT NULL,
	`series` varchar(100) DEFAULT 'Pokemon',
	`productType` enum('card','box','pack','set','other') NOT NULL DEFAULT 'other',
	`shop` varchar(100) DEFAULT 'Khác',
	`customShopName` varchar(255),
	`sourceUrl` text NOT NULL,
	`imageUrl` text,
	`price` decimal(12,2),
	`quantityLimit` varchar(100),
	`applicationStart` timestamp,
	`applicationEnd` timestamp,
	`resultDate` timestamp,
	`pickupStart` timestamp,
	`pickupEnd` timestamp,
	`requirements` text,
	`applicationStatus` enum('not_registered','registered','cancelled','won','lost','not_participating') NOT NULL DEFAULT 'not_registered',
	`resultStatus` enum('pending','won','lost','unknown') NOT NULL DEFAULT 'pending',
	`sourceTimezone` varchar(64) NOT NULL DEFAULT 'Asia/Tokyo',
	`parserStatus` enum('manual','partial','detected','unavailable') NOT NULL DEFAULT 'manual',
	`parserNote` text,
	`fieldConfidence` text,
	`sourceContentHash` varchar(64),
	`lastCheckedAt` timestamp,
	`purchaseCreatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chyusen_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chyusen_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entryId` int NOT NULL,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`changeSource` enum('manual','source_refresh','source_import') NOT NULL DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chyusen_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chyusen_monitor_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(64) DEFAULT '0 0 */6 * * *',
	`isEnabled` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chyusen_monitor_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chyusen_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entryId` int,
	`sourceId` int,
	`type` enum('deadline_72h','deadline_24h','deadline_3h','result_day','source_changed') NOT NULL,
	`notificationKey` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chyusen_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `chyusen_notifications_user_key_unique` UNIQUE(`userId`,`notificationKey`)
);
--> statement-breakpoint
CREATE TABLE `chyusen_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entryId` int,
	`sourceUrl` varchar(2048) NOT NULL,
	`label` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`latestStatus` enum('monitoring','detected','unavailable') NOT NULL DEFAULT 'monitoring',
	`latestError` text,
	`contentHash` varchar(64),
	`lastCheckedAt` timestamp,
	`lastDetectedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chyusen_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `chyusen_sources_user_url_unique` UNIQUE(`userId`,`sourceUrl`)
);
--> statement-breakpoint
CREATE INDEX `chyusen_entries_user_idx` ON `chyusen_entries` (`userId`);--> statement-breakpoint
CREATE INDEX `chyusen_entries_deadline_idx` ON `chyusen_entries` (`applicationEnd`);--> statement-breakpoint
CREATE INDEX `chyusen_history_entry_idx` ON `chyusen_history` (`entryId`);--> statement-breakpoint
CREATE INDEX `chyusen_history_user_idx` ON `chyusen_history` (`userId`);--> statement-breakpoint
CREATE INDEX `chyusen_notifications_user_read_idx` ON `chyusen_notifications` (`userId`,`isRead`);--> statement-breakpoint
CREATE INDEX `chyusen_sources_active_idx` ON `chyusen_sources` (`isActive`);