ALTER TABLE `chyusen_entries` MODIFY COLUMN `sourceUrl` text;--> statement-breakpoint
ALTER TABLE `chyusen_notifications` MODIFY COLUMN `type` varchar(64) NOT NULL;