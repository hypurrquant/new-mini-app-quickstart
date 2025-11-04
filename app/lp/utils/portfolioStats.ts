import type { CLPosition } from "../types";

export function calculatePortfolioStats(positions: CLPosition[]) {
  const activePositions = positions.filter((p) => p.isActive);
  const stakedPositions = positions.filter((p) => p.isStaked);

  // Total Deposits
  const totalDeposited = activePositions.reduce((sum, p) => {
    if (p.estimatedValueUSD) {
      return sum + parseFloat(p.estimatedValueUSD);
    }
    return sum;
  }, 0);

  // Total Claimable Rewards
  const totalClaimable = stakedPositions.reduce((sum, p) => {
    return sum + parseFloat(p.earnedAmountUSD || '0');
  }, 0);

  // Expected Daily Earnings
  const totalEarnedPerYear = stakedPositions.reduce((sum, p) => {
    return sum + parseFloat(p.rewardPerYearUSD || '0');
  }, 0);
  const expectedDaily = totalEarnedPerYear / 365.25;

  // Average APR (weighted)
  let totalValueWeighted = 0;
  let totalValue = 0;
  const stakedWithAPR = stakedPositions.filter((p) => p.estimatedAPR);
  
  stakedWithAPR.forEach((p) => {
    const value = parseFloat(p.estimatedValueUSD || '0');
    const aprStr = p.estimatedAPR || '0%';
    const apr = parseFloat(aprStr.replace('%', ''));
    totalValueWeighted += value * apr;
    totalValue += value;
  });
  
  const avgAPR = totalValue > 0 ? totalValueWeighted / totalValue : 0;

  return {
    totalDeposited,
    activeCount: activePositions.length,
    totalClaimable,
    expectedDaily,
    avgAPR,
    hasStakedPositions: stakedWithAPR.length > 0,
  };
}

