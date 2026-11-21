CREATE TABLE IF NOT EXISTS `room_results` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`slug` text NOT NULL,
	`outcome_json` text NOT NULL,
	`finished_at` integer NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_room_results_room` ON `room_results` (`room_id`,`finished_at`);