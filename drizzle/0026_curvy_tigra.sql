ALTER TABLE `login_events` ADD COLUMN IF NOT EXISTS `deviceLabel` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `sessionVersion` int DEFAULT 0 NOT NULL;
