ALTER TABLE `products` ADD `isTest` enum('yes','no') DEFAULT 'no' NOT NULL;
ALTER TABLE `products` ADD `isTest` enum('yes','no') NOT NULL DEFAULT 'no';
