CREATE TABLE `trash_auto_cleanup_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(100) NOT NULL DEFAULT '0 0 18 * * *',
	`isEnabled` int NOT NULL DEFAULT 0,
	`retentionDays` int NOT NULL DEFAULT 30,
	`lastRunAt` timestamp,
	`lastRunStatus` varchar(30),
	`lastRunSummary` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trash_auto_cleanup_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `trash_auto_cleanup_settings_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`),
	CONSTRAINT `trash_auto_cleanup_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `trash_auto_cleanup_task_idx` ON `trash_auto_cleanup_settings` (`scheduleCronTaskUid`);