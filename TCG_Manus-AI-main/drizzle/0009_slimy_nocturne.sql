CREATE TABLE `marketplace_sync_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`cronExpression` varchar(100) NOT NULL DEFAULT '0 0 */6 * * *',
	`isEnabled` int NOT NULL DEFAULT 1,
	`batchSize` int NOT NULL DEFAULT 12,
	`lastRunAt` timestamp,
	`lastRunStatus` varchar(30),
	`lastRunSummary` varchar(1000),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_sync_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `marketplace_sync_config_scheduleCronTaskUid_unique` UNIQUE(`scheduleCronTaskUid`)
);
