-- Upgrade the restored legacy Chyusen tables in-place. Existing records retain
-- their URLs and schedule data; newly added fields are nullable or defaulted.
ALTER TABLE `chyusen_entries`
  CHANGE COLUMN `sourceName` `shop` varchar(100) DEFAULT 'Khác',
  CHANGE COLUMN `registrationStartAt` `applicationStart` timestamp NULL DEFAULT NULL,
  CHANGE COLUMN `registrationDeadline` `applicationEnd` timestamp NULL DEFAULT NULL,
  CHANGE COLUMN `drawAt` `resultDate` timestamp NULL DEFAULT NULL,
  CHANGE COLUMN `notes` `requirements` text,
  MODIFY COLUMN `resultStatus` enum('pending','won','lost','unknown') NOT NULL DEFAULT 'pending';

ALTER TABLE `chyusen_entries`
  ADD COLUMN `series` varchar(100) DEFAULT 'Pokemon',
  ADD COLUMN `productType` enum('card','box','pack','set','other') NOT NULL DEFAULT 'other',
  ADD COLUMN `customShopName` varchar(255),
  ADD COLUMN `imageUrl` text,
  ADD COLUMN `price` decimal(12,2),
  ADD COLUMN `quantityLimit` varchar(100),
  ADD COLUMN `pickupStart` timestamp NULL DEFAULT NULL,
  ADD COLUMN `pickupEnd` timestamp NULL DEFAULT NULL,
  ADD COLUMN `applicationStatus` enum('not_registered','registered','cancelled','won','lost','not_participating') NOT NULL DEFAULT 'not_registered',
  ADD COLUMN `sourceTimezone` varchar(64) NOT NULL DEFAULT 'Asia/Tokyo',
  ADD COLUMN `parserStatus` enum('manual','partial','detected','unavailable') NOT NULL DEFAULT 'manual',
  ADD COLUMN `parserNote` text,
  ADD COLUMN `fieldConfidence` text,
  ADD COLUMN `sourceContentHash` varchar(64),
  ADD COLUMN `lastCheckedAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `purchaseCreatedAt` timestamp NULL DEFAULT NULL,
  ADD INDEX `chyusen_entries_user_idx` (`userId`),
  ADD INDEX `chyusen_entries_deadline_idx` (`applicationEnd`);

UPDATE `chyusen_entries`
  SET `applicationStatus` = CASE WHEN `isRegistered` = 1 THEN 'registered' ELSE 'not_registered' END;

ALTER TABLE `chyusen_sources`
  CHANGE COLUMN `sourceLabel` `label` varchar(255),
  CHANGE COLUMN `lastStatus` `latestStatus` enum('monitoring','detected','unavailable') NOT NULL DEFAULT 'monitoring',
  CHANGE COLUMN `lastError` `latestError` text,
  CHANGE COLUMN `lastContentHash` `contentHash` varchar(64),
  MODIFY COLUMN `sourceUrl` varchar(2048) NOT NULL,
  ADD COLUMN `entryId` int;

ALTER TABLE `chyusen_sources`
  ADD UNIQUE INDEX `chyusen_sources_user_url_unique` (`userId`, `sourceUrl`),
  ADD INDEX `chyusen_sources_active_idx` (`isActive`);

ALTER TABLE `chyusen_notifications`
  CHANGE COLUMN `chyusenEntryId` `entryId` int,
  CHANGE COLUMN `kind` `type` varchar(64) NOT NULL,
  ADD COLUMN `notificationKey` varchar(255) NULL;

UPDATE `chyusen_notifications`
  SET `notificationKey` = CONCAT('legacy:', `id`)
  WHERE `notificationKey` IS NULL;

ALTER TABLE `chyusen_notifications`
  MODIFY COLUMN `notificationKey` varchar(255) NOT NULL;

UPDATE `chyusen_notifications`
  SET `message` = ''
  WHERE `message` IS NULL;

ALTER TABLE `chyusen_notifications`
  MODIFY COLUMN `message` text NOT NULL,
  ADD UNIQUE INDEX `chyusen_notifications_user_key_unique` (`userId`, `notificationKey`),
  ADD INDEX `chyusen_notifications_user_read_idx` (`userId`, `isRead`);

CREATE TABLE `chyusen_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `entryId` int NOT NULL,
  `fieldName` varchar(100) NOT NULL,
  `oldValue` text,
  `newValue` text,
  `changeSource` enum('manual','source_refresh','source_import') NOT NULL DEFAULT 'manual',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `chyusen_history_entry_idx` (`entryId`),
  INDEX `chyusen_history_user_idx` (`userId`)
);

CREATE TABLE `chyusen_monitor_config` (
  `id` int AUTO_INCREMENT NOT NULL,
  `scheduleCronTaskUid` varchar(65),
  `cronExpression` varchar(64) DEFAULT '0 0 */6 * * *',
  `isEnabled` int NOT NULL DEFAULT 1,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
