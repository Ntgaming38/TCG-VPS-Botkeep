CREATE TABLE `chyusen_shop_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chyusen_shop_suggestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chyusen_shop_suggestions_user_name_unique` UNIQUE(`userId`,`name`)
);
--> statement-breakpoint
CREATE INDEX `chyusen_shop_suggestions_user_idx` ON `chyusen_shop_suggestions` (`userId`);