ALTER TABLE "messages" DROP CONSTRAINT "messages_reply_context_fk";
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_context_fk" FOREIGN KEY ("reply_to_id","thread_id","group_id") REFERENCES "public"."messages"("id","thread_id","group_id") ON DELETE cascade ON UPDATE no action;