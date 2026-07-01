-- AlterTable (reviewJson may already exist from a partial apply)
ALTER TABLE `EHSContent` ADD COLUMN `videos` TEXT NULL;
UPDATE `EHSContent` SET `videos` = '[]';
ALTER TABLE `EHSContent` MODIFY COLUMN `videos` TEXT NOT NULL;
