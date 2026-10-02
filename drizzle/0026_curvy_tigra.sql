ALTER TABLE `login_events` ADD `deviceLabel` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `sessionVersion` int DEFAULT 0 NOT NULL;
ALTER TABLE `login_events` ADD `deviceLabel` varchar(120);
