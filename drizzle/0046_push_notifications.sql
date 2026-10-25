CREATE TABLE `push_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vapidPublicKey` varchar(255) NOT NULL,
	`vapidPrivateKeyJwk` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` varchar(2048) NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`userAgent` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_idx` ON `push_subscriptions` (`userId`);