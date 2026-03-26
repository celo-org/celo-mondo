# Celo Mondo - Claude Code Guide

## Project Overview

Next.js application for Celo governance (proposals, voting, staking, delegation).
Uses PostgreSQL (Drizzle ORM), viem for on-chain reads, and React Query for data fetching.

## Key Architecture

### Governance Proposal Stages

Proposals follow this lifecycle: `Queued(1) → Referendum(3) → Execution(4) → Executed(6)/Expiration(5)`

Off-chain stages (not in Solidity): `Executed(6)`, `Withdrawn(7)`, `Rejected(8)`, `Adopted(9)`

**Stage updates happen via two mechanisms:**
1. **Event-based** (backfill): `ProposalQueued`, `ProposalExecuted`, etc. events update the DB
2. **Cron-based** (every 5 min): `src/scripts/updateProposalStages.ts` polls `getProposalStage()` on-chain for active proposals — needed because Referendum→Execution emits no event

**Client-side fallback**: `getEffectiveStage()` in `governanceData.ts` optimistically advances the displayed stage when the calculated end time has passed but the DB hasn't caught up yet.

### RPC Node Architecture

- **`PRIVATE_NO_RATE_LIMITED_NODE`**: Archive node for historical reads (quorum calculation, event lookups). Can become stale.
- **Forno** (`forno.celo.org`): Public RPC, rate-limited, no archive state. Used as fallback for current-state reads.
- The cron job checks archive node freshness against forno and falls back for `getProposalStage()` calls when stale.

## Troubleshooting

### Proposal stage not updating

1. **Check on-chain stage**: `cast call 0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972 "getProposalStage(uint256)(uint256)" <PROPOSAL_ID> --rpc-url https://forno.celo.org`
2. **Check DB stage**: `SELECT id, stage FROM proposals WHERE id = <PROPOSAL_ID>;`
3. **If they differ, check the archive node**: `cast block latest --rpc-url "https://internal-forno.dont-share.rc1-us-west1.celo-testnet.org" -f number` vs `cast block latest --rpc-url https://forno.celo.org -f number` — if the private node's block is significantly lower, it's stale
4. **Check cron logs**: `gh run list --workflow="update-proposal-stages.yml" --limit 5` then `gh run view <RUN_ID> --log | grep "Proposal <ID>"`
5. **Stage durations** (hardcoded in `src/config/consts.ts`, must match on-chain): Queued=28d, Referendum=7d, Execution=3d. Verify with: `cast call 0xD533Ca259b330c7A88f74E000a3FaEa2d63B7972 "getReferendumStageDuration()(uint256)" --rpc-url https://forno.celo.org`

### Key Files

| File | Purpose |
|------|---------|
| `src/scripts/updateProposalStages.ts` | Cron job: polls on-chain stages, updates DB |
| `src/features/governance/governanceData.ts` | `getEffectiveStage()`, `getStageEndTimestamp()` |
| `src/features/governance/hooks/useGovernanceProposals.ts` | Frontend data assembly, applies effective stage |
| `src/features/governance/components/ProposalTimeline.tsx` | Timeline UI component |
| `src/features/governance/components/StageBadge.tsx` | Stage badge rendering |
| `src/features/governance/types.ts` | `ProposalStage` enum |
| `src/config/consts.ts` | Stage duration constants |
| `.github/workflows/update-proposal-stages.yml` | Cron workflow (every 5 min) |

## Development

### Running the cron locally

```bash
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/postgres" npx tsx src/scripts/updateProposalStages.ts
```

### Testing

```bash
npx vitest run src/scripts/updateProposalStages.test.ts
npx vitest run src/features/governance/governanceData.test.ts
npx vitest run src/features/governance/components/ProposalTimeline.test.ts
```
