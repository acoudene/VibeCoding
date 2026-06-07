CREATE TABLE IF NOT EXISTS "prefixes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "value" text NOT NULL,
  "label" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "prefixes_value_unique" UNIQUE("value")
);

CREATE TABLE IF NOT EXISTS "call_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "raw_number" text NOT NULL,
  "normalized" text,
  "decision" text NOT NULL,
  "action" text NOT NULL,
  "matched_prefix" text,
  "spam" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
