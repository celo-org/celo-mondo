import { epochRewardsABI } from '@celo/abis';
import { resolveAddress } from 'src/config/contracts';
import { celoPublicClient } from 'src/utils/client';
import { logger } from 'src/utils/logger';
import { fromFixidity } from 'src/utils/numbers';
import { errorToString } from 'src/utils/strings';

export const revalidate = 900; // Cache response for 15 minutes

export async function GET() {
  try {
    logger.debug('Annual projected rate request received');

    const epochRewardsAddress = await resolveAddress('EpochRewards');

    // Fetch rewards multiplier and target voting yield parameters from contract
    const [rewardsMultiplierFraction, targetVotingYieldParameters] = await Promise.all([
      celoPublicClient.readContract({
        abi: epochRewardsABI,
        address: epochRewardsAddress,
        functionName: 'getRewardsMultiplier',
      }),
      celoPublicClient.readContract({
        abi: epochRewardsABI,
        address: epochRewardsAddress,
        functionName: 'getTargetVotingYieldParameters',
      }),
    ]);

    // Convert from fixidity format
    const targetVotingYield = fromFixidity(targetVotingYieldParameters[0]);
    const rewardsMultiplier = fromFixidity(rewardsMultiplierFraction);

    // Calculate annual projected rate
    // Target voting yield is for a single day only, so we have to calculate this for entire year
    const unadjustedAPR = targetVotingYield * 365;
    // According to the protocol it has to be adjusted by rewards multiplier
    const adjustedAPR = unadjustedAPR * rewardsMultiplier;
    const annualProjectedRate = adjustedAPR * 100;

    logger.debug(`Annual projected rate calculated: ${annualProjectedRate.toFixed(2)}%`);

    return Response.json({
      annualProjectedRate,
      percentage: `${annualProjectedRate.toFixed(2)}%`,
      details: {
        targetVotingYield,
        rewardsMultiplier,
        unadjustedAPR,
        adjustedAPR,
      },
    });
  } catch (error) {
    logger.error('Annual projected rate calculation error', error);
    return new Response(`Unable to calculate annual projected rate: ${errorToString(error)}`, {
      status: 500,
    });
  }
}
