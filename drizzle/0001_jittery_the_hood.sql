CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`slug` text NOT NULL,
	`state_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_sessions_room_id` ON `game_sessions` (`room_id`);--> statement-breakpoint
CREATE TABLE `game_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`round` integer NOT NULL,
	`player_id` text NOT NULL,
	`kind` text NOT NULL,
	`value_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_game_submissions_unique` ON `game_submissions` (`session_id`,`round`,`player_id`,`kind`);