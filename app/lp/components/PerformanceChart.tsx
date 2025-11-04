"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface Position {
  isStaked: boolean;
  rewardPerYearUSD?: string;
  estimatedValueUSD?: string;
}

interface PerformanceChartProps {
  positions: Position[];
  darkMode: boolean;
  theme: any;
}

export default function PerformanceChart({ positions, darkMode, theme }: PerformanceChartProps) {
  const chartData = useMemo(() => {
    const stakedPositions = positions.filter((p) => p.isStaked && p.rewardPerYearUSD);
    if (stakedPositions.length === 0) return [];

    // Calculate daily reward total
    const totalDailyReward = stakedPositions.reduce((sum, p) => {
      return sum + (parseFloat(p.rewardPerYearUSD || '0') / 365.25);
    }, 0);

    // Generate projected earnings for 30 days
    const data = [];
    for (let day = 0; day <= 30; day++) {
      data.push({
        day: day,
        cumulativeEarnings: totalDailyReward * day,
        dailyRate: totalDailyReward,
      });
    }
    return data;
  }, [positions]);

  if (chartData.length === 0) return null;

  return (
    <div style={{ 
      marginBottom: 16, 
      padding: 16, 
      background: theme.bgCard, 
      borderRadius: 12, 
      border: `1px solid ${theme.border}` 
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>📈</span> Projected Earnings (30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
          <XAxis 
            dataKey="day" 
            stroke={theme.textSecondary}
            label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: theme.textSecondary }}
          />
          <YAxis 
            stroke={theme.textSecondary}
            label={{ value: 'USD', angle: -90, position: 'insideLeft', fill: theme.textSecondary }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip 
            contentStyle={{ 
              background: theme.bgCard, 
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              color: theme.text
            }}
            formatter={(value: any) => [`$${value.toFixed(2)}`, 'Cumulative Earnings']}
            labelFormatter={(label) => `Day ${label}`}
          />
          <Line 
            type="monotone" 
            dataKey="cumulativeEarnings" 
            stroke={theme.success} 
            strokeWidth={2}
            dot={false}
            name="Cumulative Earnings"
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
        Based on current staking rewards • Updated in real-time
      </div>
    </div>
  );
}

