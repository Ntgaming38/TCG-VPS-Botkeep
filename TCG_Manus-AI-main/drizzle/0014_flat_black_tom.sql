ALTER TABLE `chyusen_entries` ADD `deletedAt` timestamp;--> statement-breakpoint
CREATE INDEX `chyusen_entries_user_deleted_idx` ON `chyusen_entries` (`userId`,`deletedAt`);