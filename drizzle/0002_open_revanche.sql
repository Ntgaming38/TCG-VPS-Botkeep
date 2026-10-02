ALTER TABLE `products` MODIFY COLUMN `status` enum('in_stock','sold','reserved','traded','damaged') NOT NULL DEFAULT 'in_stock';--> statement-breakpoint
ALTER TABLE `products` ADD `damagedQuantity` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `damageNote` text;