CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`description` text,
	`entityType` varchar(50),
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productId` int NOT NULL,
	`oldPrice` decimal(12,2),
	`newPrice` decimal(12,2) NOT NULL,
	`source` varchar(100) DEFAULT 'manual',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `price_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`series` varchar(100) DEFAULT 'Pokemon',
	`setName` varchar(255),
	`type` enum('card','box','pack') NOT NULL,
	`image` text,
	`description` text,
	`cardNumber` varchar(50),
	`language` varchar(20) DEFAULT 'Japanese',
	`rarity` varchar(50),
	`condition` varchar(50) DEFAULT 'New',
	`psaGrade` varchar(20),
	`releaseDate` varchar(20),
	`quantity` int NOT NULL DEFAULT 0,
	`buyPrice` decimal(12,2) DEFAULT '0',
	`marketPrice` decimal(12,2) DEFAULT '0',
	`sellPrice` decimal(12,2) DEFAULT '0',
	`status` enum('in_stock','sold','reserved','traded') NOT NULL DEFAULT 'in_stock',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`shop` varchar(255),
	`purchaseType` enum('mua_le','coc_5','coc_10','coc_30') DEFAULT 'mua_le',
	`quantity` int NOT NULL DEFAULT 1,
	`price` decimal(12,2) NOT NULL,
	`totalPrice` decimal(12,2) NOT NULL,
	`note` text,
	`image` text,
	`status` enum('paid','received','pending','cancelled') DEFAULT 'received',
	`purchaseDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`productId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`salePrice` decimal(12,2) NOT NULL,
	`totalRevenue` decimal(12,2) NOT NULL,
	`platform` enum('snkrdunk','mercari','yahoo','shop','offline','other') DEFAULT 'snkrdunk',
	`fee` decimal(12,2) DEFAULT '0',
	`shippingFee` decimal(12,2) DEFAULT '0',
	`otherCost` decimal(12,2) DEFAULT '0',
	`profit` decimal(12,2) DEFAULT '0',
	`note` text,
	`image` text,
	`saleDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `language` varchar(10) DEFAULT 'vi';--> statement-breakpoint
ALTER TABLE `users` ADD `currency` varchar(10) DEFAULT 'JPY';