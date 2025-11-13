# Test Data Population Script

This document describes the test data population script for the Celo governance database.

## Overview

The `populateTestData.ts` script populates a local database with test proposals covering all 26 possible proposal states in the Celo governance system. This is useful for:

- Development and testing
- UI/UX testing of all proposal states
- Database schema validation
- Integration testing

## Safety Features

The script includes multiple safety checks to prevent accidental execution on production databases:

1. **Local Database Check**: Verifies that `POSTGRES_URL` points to `localhost` or `127.0.0.1`
2. **Production Environment Check**: Blocks execution if `IS_PRODUCTION_DATABASE=true` or `NODE_ENV=production`
3. **Conflict Handling**: Uses `onConflictDoNothing()` to prevent overwriting existing data

## Usage

### Prerequisites

1. Ensure you have a local PostgreSQL database running
2. Set your `.env` file to point to the local database:
   ```
   POSTGRES_URL=postgresql://user:password@localhost:5432/celo_mondo_test
   ```

### Running the Script

```bash
yarn populate-test-data
```

## Test Proposals Created

The script creates 26 proposals covering the following states:

### Draft / None Stage (1 proposal)
1. **In draft** - No on-chain events, metadata only

### Queued Stage (4 proposals)
2. **In queue without upvotes** - Queued but no upvotes yet
3. **In queue with upvotes** - Queued with active upvotes
4. **Expired from queued stage** - Never dequeued, expired after 28 days
24. **With revoked upvotes** - Had upvotes that were later revoked

### Referendum Stage (8 proposals)
5. **Referendum - Yes > No, No Quorum, No Approval**
6. **Referendum - Yes > No, Passing Quorum, No Approval**
7. **Referendum - Yes > No, No Quorum, Approved**
8. **Referendum - Yes > No, Passing Quorum, Approved**
9. **Referendum - No > Yes, No Quorum**
10. **Referendum - No > Yes, Passing Quorum**
11. **Referendum - Tied Votes** (equal YES and NO)
25. **With revoked votes** - Had votes that were later revoked

### Execution Stage (3 proposals)
12. **Execution - No Approval**
13. **Execution - Partial Approval**
14. **Execution - Full Approval**

### Terminal Success State (1 proposal)
15. **Successfully Executed** - Completed and executed

### Expired States (4 proposals)
16. **Expired from referendum - Approved**
17. **Expired from referendum - No Approval**
18. **Expired from execution - Approved**
19. **Expired from execution - No Approval**

### Withdrawn States (3 proposals)
20. **Withdrawn from queue**
21. **Withdrawn from referendum**
22. **Withdrawn from execution**

### Rejected State (1 proposal)
23. **Rejected** - Expired with more NO votes than YES votes

### Re-submission (2 proposals)
26. **Original proposal** (rejected) and **Re-submitted proposal** (active) - Demonstrates the `pastId` linking

## Data Generated

For each test run, the script generates:
- **26 proposals** with IDs starting from 1000 (1000-1026)
- **CGP numbers** starting from 9000 (9000-9025)
- **~60+ events** (ProposalQueued, ProposalDequeued, ProposalApproved, ProposalExecuted, etc.)
- **~70+ vote records** (Yes, No, Abstain votes for each proposal)

All proposals reference the mock proposal file at:
```
https://raw.githubusercontent.com/celo-org/celo-mondo/main/mock-proposal.md
```

## Technical Details

### Timestamps
- Uses current time as base reference
- Calculates historical timestamps for expired/completed proposals
- Uses realistic time intervals (28 days for queue expiry, 7 days for referendum, 3 days for execution)

### Quorum Calculations
- Network weight: 1M CELO (1,000,000,000,000,000,000,000,000 wei)
- Quorum threshold: 1% of network weight (10K CELO)
- Half quorum: 5K CELO
- Double quorum: 20K CELO

### Vote Distributions
Proposals are created with various vote distributions to test:
- Passing quorum (votes > 10K CELO)
- Not passing quorum (votes < 10K CELO)
- More YES than NO votes
- More NO than YES votes
- Equal YES and NO votes (tied)

### Block Numbers and Transaction Hashes
- Block numbers start at 20,000,000 and increment
- Transaction hashes are generated as mock values for uniqueness

## Database Schema

The script populates three main tables:
- `events` - Governance events (ProposalQueued, ProposalDequeued, etc.)
- `proposals` - Proposal metadata and state
- `votes` - Vote counts (Yes, No, Abstain) for each proposal

## Cleanup

To remove test data, you can run SQL queries to delete proposals with IDs >= 1000:

```sql
DELETE FROM votes WHERE "proposalId" >= 1000;
DELETE FROM proposals WHERE id >= 1000;
DELETE FROM events WHERE (args->>'proposalId')::bigint >= 1000;
```

Or simply drop and recreate your local test database.

## Troubleshooting

### Error: "This script can only be run on a local database!"
- Ensure your `POSTGRES_URL` environment variable points to localhost
- Check that you're not using a remote database connection

### Error: "Cannot run test data population in production environment!"
- Set `NODE_ENV` to `development` or remove it
- Ensure `IS_PRODUCTION_DATABASE` is not set to `true`

### Conflicts with existing data
- The script uses `onConflictDoNothing()` to avoid overwriting data
- If you need fresh data, clear test proposals first (see Cleanup section)

## Future Enhancements

Possible improvements:
- Add CLI flags for customizing proposal ID ranges
- Support for creating specific proposal states on demand
- Option to clear existing test data before populating
- Generate more realistic vote distributions
- Add support for multi-sig approval tracking
