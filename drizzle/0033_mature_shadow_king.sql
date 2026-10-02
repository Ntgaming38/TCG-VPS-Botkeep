CREATE TABLE `snkr_shop_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`productType` enum('card','box','pack') NOT NULL DEFAULT 'box',
	`cardRank` varchar(8),
	`sourceUrl` varchar(2048) NOT NULL,
	`currentPrice` decimal(12,2) NOT NULL DEFAULT '0',
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `snkr_shop_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `snkr_shop_items_user_url_unique` UNIQUE(`userId`,`sourceUrl`)
);
--> statement-breakpoint
CREATE TABLE `snkr_shop_price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemId` int NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`source` varchar(100) NOT NULL DEFAULT 'snkrdunk',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `snkr_shop_price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `snkr_shop_items_user_updated_idx` ON `snkr_shop_items` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `snkr_shop_price_history_item_created_idx` ON `snkr_shop_price_history` (`itemId`,`createdAt`,`id`);