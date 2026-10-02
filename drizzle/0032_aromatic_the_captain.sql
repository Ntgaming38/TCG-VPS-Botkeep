CREATE TABLE `marketplace_sync_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`productName` varchar(255) NOT NULL,
	`sourceUrl` varchar(2048) NOT NULL,
	`cardRank` varchar(8),
	`errorMessage` varchar(1000) NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `marketplace_sync_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `marketplace_sync_errors_user_occurred_idx` ON `marketplace_sync_errors` (`userId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `marketplace_sync_errors_user_product_resolved_idx` ON `marketplace_sync_errors` (`userId`,`productId`,`resolvedAt`);