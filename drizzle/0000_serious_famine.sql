CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`eaten_on` text NOT NULL,
	`meal_type` text NOT NULL,
	`item_type` text NOT NULL,
	`item_id` text NOT NULL,
	`item_name` text NOT NULL,
	`quantity` real NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_meals_owner_day` ON `meals` (`owner_id`,`eaten_on`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`brand` text DEFAULT '' NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_products_owner_name` ON `products` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`portions` integer NOT NULL,
	`ingredients_json` text NOT NULL,
	`kcal` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_recipes_owner_name` ON `recipes` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`goal_kcal` integer DEFAULT 2000 NOT NULL
);
