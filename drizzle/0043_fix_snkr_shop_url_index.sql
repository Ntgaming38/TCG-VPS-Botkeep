ALTER TABLE `snkr_shop_items` DROP INDEX `snkr_shop_items_user_url_unique`;--> statement-breakpoint
CREATE INDEX `snkr_shop_items_user_url_idx` ON `snkr_shop_items` (`userId`);