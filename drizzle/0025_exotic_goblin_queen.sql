CREATE TABLE `sale_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sale_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sale_locations_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
ALTER TABLE `sales` ADD `saleLocation` varchar(255);--> statement-breakpoint
CREATE INDEX `sale_locations_user_idx` ON `sale_locations` (`userId`);