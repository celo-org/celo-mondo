CREATE TABLE "approvals" (
	"chainId" integer NOT NULL,
	"proposalId" bigint NOT NULL,
	"multisigTxId" bigint NOT NULL,
	"approver" varchar(42) NOT NULL,
	"confirmedAt" integer NOT NULL,
	"blockNumber" numeric NOT NULL,
	"transactionHash" varchar(66) NOT NULL,
	CONSTRAINT "approvals_chainId_proposalId_approver_pk" PRIMARY KEY("chainId","proposalId","approver")
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_proposalId_chainId_proposals_id_chainId_fk" FOREIGN KEY ("proposalId","chainId") REFERENCES "public"."proposals"("id","chainId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approvals_proposalId_index" ON "approvals" USING btree ("proposalId");--> statement-breakpoint
CREATE INDEX "approvals_multisigTxId_index" ON "approvals" USING btree ("multisigTxId");--> statement-breakpoint
CREATE INDEX "approvals_chainId_index" ON "approvals" USING btree ("chainId");