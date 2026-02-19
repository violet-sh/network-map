ALTER TABLE "pops" RENAME COLUMN "fac" TO "peeringdbId";--> statement-breakpoint
ALTER TABLE "pops" DROP CONSTRAINT "pops_fac_unique";--> statement-breakpoint
ALTER TABLE "pops" ALTER COLUMN "provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pops" ADD COLUMN "type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "pops" DROP COLUMN "active";