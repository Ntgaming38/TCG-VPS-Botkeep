ALTER TABLE `chyusen_sources` DROP INDEX `chyusen_sources_user_url_unique`;--> statement-breakpoint
CREATE INDEX `chyusen_sources_user_url_idx` ON `chyusen_sources` (`userId`);