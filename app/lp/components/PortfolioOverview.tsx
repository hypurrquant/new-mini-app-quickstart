import { useMemo } from "react";
import type { CLPosition, Theme } from "../types";
import { calculatePortfolioStats } from "../utils/portfolioStats";

interface PortfolioOverviewProps {
  positions: CLPosition[];
  theme: Theme;
  darkMode: boolean;
}

export default function PortfolioOverview({ positions, theme, darkMode }: PortfolioOverviewProps) {
  const stats = useMemo(() => calculatePortfolioStats(positions), [positions]);

  if (positions.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📊</span> Portfolio Overview
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* Total Deposits */}
        <div style={{ 
          padding: 16, 
          background: theme.bgCard, 
          borderRadius: 12, 
          border: `2px solid ${theme.border}`,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
            Total Deposits
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
            ${stats.totalDeposited.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <div style={{ fontSize: 13, color: theme.textSecondary }}>
            {stats.activeCount} active position{stats.activeCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Total Claimable Rewards + Expected Daily */}
        <div style={{ 
          padding: 16, 
          background: theme.bgCard, 
          borderRadius: 12, 
          border: `2px solid ${theme.border}`,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
            Claimable Rewards
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.success, marginBottom: 4 }}>
            ${stats.totalClaimable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
            Ready to claim
          </div>
          {stats.expectedDaily > 0 && (
            <div style={{ fontSize: 12, color: theme.textSecondary, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
              Expected: <span style={{ fontWeight: 600, color: theme.success }}>${stats.expectedDaily.toFixed(2)}/day</span>
            </div>
          )}
        </div>

        {/* Average APR */}
        <div style={{ 
          padding: 16, 
          background: theme.bgCard, 
          borderRadius: 12, 
          border: `2px solid ${theme.border}`,
          boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
            Average APR
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: stats.hasStakedPositions ? theme.primary : theme.textSecondary, marginBottom: 4 }}>
            {stats.avgAPR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
          </div>
          <div style={{ fontSize: 13, color: theme.textSecondary }}>
            {stats.hasStakedPositions ? 'weighted by position size' : 'No staked positions'}
          </div>
        </div>
      </div>
    </div>
  );
}

