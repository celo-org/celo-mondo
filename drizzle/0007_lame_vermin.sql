CREATE TABLE "votes_alchemy" (
	"chainId" integer NOT NULL,
	"type" "voteType" NOT NULL,
	"count" numeric NOT NULL,
	"proposalId" bigint NOT NULL,
	CONSTRAINT "votes_alchemy_chainId_type_proposalId_pk" PRIMARY KEY("chainId","type","proposalId")
);
--> statement-breakpoint
ALTER TABLE "votes_alchemy" ADD CONSTRAINT "votes_alchemy_chainId_chains_id_fk" FOREIGN KEY ("chainId") REFERENCES "public"."chains"("id") ON DELETE restrict ON UPDATE no action;