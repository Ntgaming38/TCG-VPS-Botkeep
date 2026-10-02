ALTER TABLE `snkr_shop_items` ADD `isPinned` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `snkr_shop_items_user_pinned_idx` ON `snkr_shop_items` (`userId`,`isPinned`,`updatedAt`);