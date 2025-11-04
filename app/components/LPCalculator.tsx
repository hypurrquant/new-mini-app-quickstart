"use client";
import { useState } from "react";

interface LPCalculatorProps {
  darkMode: boolean;
  theme: {
    bg: string;
    bgSecondary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
    cardBg: string;
    gradient: string;
  };
}

export default function LPCalculator({ darkMode, theme }: LPCalculatorProps) {
  const [initialDeposit, setInitialDeposit] = useState("10000");
  const [apr, setApr] = useState("50");
  const [periodUnit, setPeriodUnit] = useState<"days" | "months">("days");
  const [periodValue, setPeriodValue] = useState(30);

  // APY 계산 (복리 계산)
  const calculateEarnings = (principal: number, aprPercent: number, days: number) => {
    const aprDecimal = aprPercent / 100;
    // 복리 계산: A = P(1 + r/n)^(nt), 여기서 n은 연간 복리 횟수 (일일 복리 가정)
    const dailyRate = aprDecimal / 365;
    const futureValue = principal * Math.pow(1 + dailyRate, days);
    const earnings = futureValue - principal;
    return { total: futureValue, earnings };
  };

  // 기간을 일수로 변환
  const getDays = () => {
    if (periodUnit === "days") {
      return periodValue;
    } else {
      return periodValue * 30; // 월을 일로 변환 (30일 기준)
    }
  };

  const principal = parseFloat(initialDeposit) || 0;
  const aprValue = parseFloat(apr) || 0;
  const totalDays = getDays();
  const result = calculateEarnings(principal, aprValue, totalDays);

  // 비교 대상들
  const comparisons = [
    {
      name: "LPing (Staked)",
      apr: aprValue,
      earnings: result.earnings,
      isHighlight: true,
    },
    {
      name: "Traditional Savings",
      apr: 3,
      earnings: calculateEarnings(principal, 3, totalDays).earnings,
      isHighlight: false,
    },
    {
      name: "U.S. Treasury Bonds",
      apr: 4,
      earnings: calculateEarnings(principal, 4, totalDays).earnings,
      isHighlight: false,
    },
    {
      name: "Basic Staking",
      apr: 2,
      earnings: calculateEarnings(principal, 2, totalDays).earnings,
      isHighlight: false,
    },
  ];

  const maxEarnings = Math.max(...comparisons.map(c => c.earnings));

  return (
    <div style={{
      maxWidth: 1400,
      margin: '120px auto 0',
      padding: '0 24px',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: 64,
      }}>
        <h2 style={{
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 800,
          marginBottom: 16,
          color: theme.text,
          letterSpacing: '-0.02em',
        }}>
          Calculate Your Potential Earnings
        </h2>
        <p style={{
          fontSize: 20,
          color: theme.textSecondary,
          maxWidth: 700,
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          See how much you could earn with different LP strategies over time
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: 32,
      }}>
        {/* Left Panel - Input */}
        <div style={{
          padding: 40,
          background: theme.cardBg,
          borderRadius: 20,
          boxShadow: darkMode
            ? '0 4px 12px rgba(0, 0, 0, 0.4)'
            : '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}>
          <h3 style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 32,
            color: theme.text,
            letterSpacing: '-0.01em',
          }}>
            Investment Details
          </h3>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 8,
            }}>
              Initial Deposit (USD)
            </label>
            <input
              type="number"
              value={initialDeposit}
              onChange={(e) => setInitialDeposit(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: 16,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                background: theme.bg,
                color: theme.text,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${darkMode ? 'rgba(66, 165, 245, 0.1)' : 'rgba(37, 99, 235, 0.1)'}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
              min="0"
              step="100"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 8,
            }}>
              Estimated APR (%)
            </label>
            <input
              type="number"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: 16,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                background: theme.bg,
                color: theme.text,
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${darkMode ? 'rgba(66, 165, 245, 0.1)' : 'rgba(37, 99, 235, 0.1)'}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: theme.text,
              marginBottom: 12,
            }}>
              Hold for {periodValue} {periodUnit === "days" ? (periodValue === 1 ? "Day" : "Days") : (periodValue === 1 ? "Month" : "Months")}
            </label>
            
            <div style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <input
                type="number"
                value={periodValue}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                const max = periodUnit === "days" ? 365 : 120; // Months: up to 120 months (10 years)
                const min = 1;
                if (value >= min && value <= max) {
                  setPeriodValue(value);
                }
              }}
              min={1}
              max={periodUnit === "days" ? 365 : 120}
                style={{
                  width: 100,
                  padding: '12px 14px',
                  fontSize: 16,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10,
                  background: theme.bg,
                  color: theme.text,
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  fontWeight: 600,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.accent;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${darkMode ? 'rgba(66, 165, 245, 0.1)' : 'rgba(37, 99, 235, 0.1)'}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.border;
                  e.currentTarget.style.boxShadow = 'none';
                  const value = parseInt(e.target.value) || 1;
                  const max = periodUnit === "days" ? 365 : 120;
                  const min = 1;
                  if (value < min) setPeriodValue(min);
                  if (value > max) setPeriodValue(max);
                }}
              />
              <div style={{
                display: 'flex',
                gap: 8,
                background: theme.bgSecondary,
                borderRadius: 8,
                padding: 4,
              }}>
                <button
                  onClick={() => setPeriodUnit("days")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: periodUnit === "days" ? theme.gradient : darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    color: periodUnit === "days" ? '#ffffff' : theme.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Days
                </button>
                <button
                  onClick={() => setPeriodUnit("months")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: periodUnit === "months" ? theme.gradient : darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    color: periodUnit === "months" ? '#ffffff' : theme.text,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Months
                </button>
              </div>
            </div>
            
            <input
              type="range"
              min={periodUnit === "days" ? 1 : 1}
              max={periodUnit === "days" ? 365 : 120}
              value={periodValue}
              onChange={(e) => setPeriodValue(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: 8,
                borderRadius: 4,
                background: theme.bgSecondary,
                outline: 'none',
                WebkitAppearance: 'none',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: theme.textSecondary,
              marginTop: 4,
            }}>
              {periodUnit === "days" ? (
                <>
                  <span>1 Day</span>
                  <span>30 Days</span>
                  <span>90 Days</span>
                  <span>365 Days</span>
                </>
              ) : (
                <>
                  <span>1 Month</span>
                  <span>3 Months</span>
                  <span>6 Months</span>
                  <span>12 Months +</span>
                </>
              )}
            </div>
          </div>

          <div style={{
            padding: 16,
            background: darkMode ? 'rgba(66, 165, 245, 0.1)' : 'rgba(37, 99, 235, 0.05)',
            borderRadius: 8,
            fontSize: 12,
            color: theme.textSecondary,
            lineHeight: 1.6,
          }}>
            <strong>Disclosure:</strong> APY rates are variable and not guaranteed. 
            This calculator is for illustrative purposes only. Actual returns may vary based on market conditions and impermanent loss.
          </div>
        </div>

        {/* Right Panel - Results */}
        <div style={{
          padding: 40,
          background: darkMode ? '#1a1a1a' : '#f8f9fa',
          borderRadius: 20,
          boxShadow: darkMode
            ? '0 4px 12px rgba(0, 0, 0, 0.4)'
            : '0 4px 12px rgba(0, 0, 0, 0.05)',
        }}>
          <h3 style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 12,
            color: theme.text,
            letterSpacing: '-0.01em',
          }}>
            Potential Earnings Comparison
          </h3>
          <p style={{
            fontSize: 14,
            color: theme.textSecondary,
            marginBottom: 24,
          }}>
            Estimated returns over {periodValue} {periodUnit === "days" ? (periodValue === 1 ? "day" : "days") : (periodValue === 1 ? "month" : "months")}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {comparisons.map((item, idx) => {
              const barWidth = (item.earnings / maxEarnings) * 100;
              return (
                <div key={idx}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: theme.text,
                      }}>
                        {item.name}
                      </span>
                      {item.isHighlight && (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: theme.gradient,
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700,
                        }}>
                          HIGHEST YIELD
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: item.isHighlight ? theme.accent : theme.text,
                      }}>
                        ${item.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{
                        fontSize: 14,
                        color: theme.textSecondary,
                      }}>
                        {item.apr.toFixed(2)}% APY
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: '100%',
                    height: 8,
                    background: theme.bgSecondary,
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      background: item.isHighlight ? theme.gradient : theme.border,
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Value Display */}
          <div style={{
            marginTop: 32,
            padding: 24,
            background: theme.cardBg,
            borderRadius: 12,
            border: `2px solid ${theme.accent}`,
          }}>
            <div style={{
              fontSize: 14,
              color: theme.textSecondary,
              marginBottom: 8,
            }}>
              Total Value After {periodValue} {periodUnit === "days" ? (periodValue === 1 ? "Day" : "Days") : (periodValue === 1 ? "Month" : "Months")}
            </div>
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              color: theme.accent,
              marginBottom: 4,
            }}>
              ${result.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{
              fontSize: 16,
              color: theme.textSecondary,
            }}>
              Initial: ${principal.toLocaleString()} + Earnings: ${result.earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

