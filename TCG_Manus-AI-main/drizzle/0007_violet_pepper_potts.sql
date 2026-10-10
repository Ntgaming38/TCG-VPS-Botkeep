CREATE TABLE `chyusen_source_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceId` int NOT NULL,
	`entryId` int,
	`previousHash` varchar(64),
	`currentHash` varchar(64) NOT NULL,
	`changeType` enum('content_changed','first_seen','unavailable') NOT NULL DEFAULT 'content_changed',
	`summary` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chyusen_source_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `chyusen_source_history_source_hash_unique` UNIQUE(`sourceId`,`currentHash`)
);
--> statement-breakpoint
ALTER TABLE `chyusen_monitor_config` MODIFY COLUMN `cronExpression` varchar(64) DEFAULT '0 0 * * * *';--> statement-breakpoint
CREATE INDEX `chyusen_source_history_source_idx` ON `chyusen_source_history` (`sourceId`);--> statement-breakpoint
CREATE INDEX `chyusen_source_history_user_idx` ON `chyusen_source_history` (`userId`);