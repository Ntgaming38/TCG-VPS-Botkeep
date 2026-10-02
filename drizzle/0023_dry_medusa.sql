CREATE TABLE `auto_backup_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`frequency` enum('weekly','monthly') NOT NULL DEFAULT 'weekly',
	`cronExpression` varchar(100) NOT NULL DEFAULT '0 0 3 * * 0',
	`isEnabled` int NOT NULL DEFAULT 0,
	`lastRunAt` timestamp,
	`lastRunStatus` varchar(30),
	`lastRunSummary` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `auto_backup_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `auto_backup_settings_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`),
	CONSTRAINT `auto_backup_settings_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `backup_archives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int NOT NULL DEFAULT 0,
	`source` enum('scheduled','manual') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_archives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `backup_restore_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceFileName` varchar(255) NOT NULL,
	`scope` varchar(32) NOT NULL,
	`restoredProducts` int NOT NULL DEFAULT 0,
	`restoredPurchases` int NOT NULL DEFAULT 0,
	`restoredSales` int NOT NULL DEFAULT 0,
	`restoredChyusen` int NOT NULL DEFAULT 0,
	`restoredSources` int NOT NULL DEFAULT 0,
	`restoredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `backup_restore_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accentColor` varchar(24) NOT NULL DEFAULT '#DC2626',
	`logoUrl` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `report_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `report_branding_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `auto_backup_settings_task_idx` ON `auto_backup_settings` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `backup_archives_user_created_idx` ON `backup_archives` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `backup_restore_history_user_created_idx` ON `backup_restore_history` (`userId`,`restoredAt`);