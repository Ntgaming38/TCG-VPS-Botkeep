CREATE TABLE `trash_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`snapshot` text NOT NULL,
	`deletedAt` timestamp NOT NULL DEFAULT (now()),
	`restoredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trash_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `trash_items_user_deleted_idx` ON `trash_items` (`userId`,`deletedAt`);--> statement-breakpoint
CREATE INDEX `trash_items_user_type_idx` ON `trash_items` (`userId`,`entityType`);