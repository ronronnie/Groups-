CREATE TABLE "group_knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"href" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"model_alias" text NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_knowledge_documents_kind_check" CHECK ("group_knowledge_documents"."source_kind" in ('job', 'job_share', 'discussion', 'profile', 'outcome', 'reputation')),
	CONSTRAINT "group_knowledge_documents_content_check" CHECK (length(trim("group_knowledge_documents"."content")) > 0)
);
--> statement-breakpoint
ALTER TABLE "group_knowledge_documents" ADD CONSTRAINT "group_knowledge_documents_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_knowledge_documents_source_unique" ON "group_knowledge_documents" USING btree ("group_id","source_key");--> statement-breakpoint
CREATE INDEX "group_knowledge_documents_group_updated_idx" ON "group_knowledge_documents" USING btree ("group_id","updated_at");--> statement-breakpoint
CREATE INDEX "group_knowledge_documents_embedding_hnsw_idx" ON "group_knowledge_documents" USING hnsw ("embedding" vector_cosine_ops);