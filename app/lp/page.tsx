"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { publicClient } from "../../lib/viemClient";
import { AERODROME_PAIR_ABI, ERC20_ABI } from "../../lib/abis";
import { Address, formatUnits, isAddress } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import Link from "next/link";
import PerformanceChart from "../components/PerformanceChart";

const FEE_BPS_VOLATILE = Number(process.env.NEXT_PUBLIC_FEE_BPS_VOLATILE ?? "30"); // 0.30%
const FEE_BPS_STABLE = Number(process.env.NEXT_PUBLIC_FEE_BPS_STABLE ?? "2"); // 0.02%
const AUTO_FETCH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_LP_COOLDOWN_MS ?? "15000");
const FAIL_BACKOFF_MS = Number(process.env.NEXT_PUBLIC_LP_FAIL_BACKOFF_MS ?? "30000");

type LpResult = {
  pairAddress: Address;
  pairSymbol: string;
  lpBalanceFormatted: string;
  lpBalanceRaw: bigint;
  sharePercent: string;
  token0: { address: Address; symbol: string; amountFormatted: string };
  token1: { address: Address; symbol: string; amountFormatted: string };
  tvlUsd?: string;
  positionUsd?: string;
  aprPercent?: string;
};

export default function LpCheckerPage() {
  const searchParams = useSearchParams();
  const { address: connectedAddress, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const [lpInput, setLpInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LpResult[]>([]);
  const [lastFetchKey, setLastFetchKey] = useState<string | null>(null);
  const [discoveredOnce, setDiscoveredOnce] = useState(false);
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState<string | null>(null);
  const [clPositions, setClPositions] = useState<
    Array<{
      tokenId: string;
      token0: Address;
      token1: Address;
      token0Symbol?: string;
      token1Symbol?: string;
      pairSymbol?: string;
      token0Decimals?: number;
      token1Decimals?: number;
      tickSpacing: number;
      tickLower: number;
      tickUpper: number;
      liquidity: string;
      liquidityRaw?: string;
      isActive?: boolean;
      isStaked?: boolean;
      isInRange?: boolean;
      pool: Address | null;
      slot0?: { sqrtPriceX96: string; tick: number };
      poolLiquidity?: string;
      price1Per0?: number;
      price0Per1?: number;
      priceRange1Per0Min?: number;
      priceRange1Per0Max?: number;
      priceRange0Per1Min?: number;
      priceRange0Per1Max?: number;
    }>
  >([]);
  const [invertMap, setInvertMap] = useState<Record<string, boolean>>({}); // true => show 1 token1 in token0
  const lastAutoFetchAtRef = useRef<number>(0);
  const lastClFetchAtRef = useRef<number>(0);
  const nextAllowedV2AtRef = useRef<number>(0);
  const nextAllowedCLAtRef = useRef<number>(0);
  const [copied, setCopied] = useState(false);
  const [onlyPositive, setOnlyPositive] = useState(true);
  const [tickClock, setTickClock] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
    }
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Theme colors
  const theme = {
    bg: darkMode ? '#1a1a1a' : '#ffffff',
    bgSecondary: darkMode ? '#2a2a2a' : '#fafafa',
    bgCard: darkMode ? '#2d2d2d' : '#ffffff',
    border: darkMode ? '#444' : '#eee',
    text: darkMode ? '#e0e0e0' : '#000000',
    textSecondary: darkMode ? '#a0a0a0' : '#666',
    success: darkMode ? '#4caf50' : '#2e7d32',
    successBg: darkMode ? '#1b5e20' : '#e8f5e9',
    successBorder: darkMode ? '#2e7d32' : '#c8e6c9',
    warning: darkMode ? '#ff9800' : '#c62828',
    warningBg: darkMode ? '#e65100' : '#ffebee',
    primary: darkMode ? '#42a5f5' : '#1976d2',
    skeleton: darkMode ? '#3a3a3a' : '#f3f3f3',
    infoBg: darkMode ? '#424242' : '#fff8e1',
    infoBorder: darkMode ? '#616161' : '#ffecb5',
  };

  const viewAddress = useMemo(() => {
    const v = searchParams.get("view");
    return v && isAddress(v) ? (v as Address) : undefined;
  }, [searchParams]);

  const lpQueryFromUrl = useMemo(() => {
    const lp = searchParams.get("lp");
    if (!lp) return [] as Address[];
    return lp
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isAddress(s)) as Address[];
  }, [searchParams]);

  const ownerAddress = viewAddress ?? connectedAddress;

  const resolveLpAddresses = (): Address[] => {
    if (lpQueryFromUrl.length > 0) return lpQueryFromUrl;
    const fromInput = lpInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => isAddress(s)) as Address[];
    return fromInput;
  };

  // No manual input persistence; discovery fills pairs automatically

  // Simple 1s ticker for countdowns
  useEffect(() => {
    const id = setInterval(() => setTickClock((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // V3 only: no v2 auto-fetch

  // V3 only: no v2 auto-discovery

  // V3 only: auto discover CL positions when connected
  useEffect(() => {
    if (!ownerAddress) return;
    if (clLoading || clPositions.length > 0) return;
    (async () => {
      const now = Date.now();
      if (now - lastClFetchAtRef.current < AUTO_FETCH_COOLDOWN_MS) return;
      if (now < nextAllowedCLAtRef.current) return;
      lastClFetchAtRef.current = now;
      try {
        setClLoading(true);
        setClError(null);
        const res = await fetch(`/api/cl-positions?owner=${ownerAddress}`);
        if (!res.ok) {
          setClError("CL fetch failed");
          setClLoading(false);
          nextAllowedCLAtRef.current = Date.now() + FAIL_BACKOFF_MS;
          return;
        }
        const data = await res.json();
        setClPositions(data?.positions || []);
      } catch (e) {
        setClError(e instanceof Error ? e.message : String(e));
        nextAllowedCLAtRef.current = Date.now() + FAIL_BACKOFF_MS;
      } finally {
        setClLoading(false);
      }
    })();
  }, [ownerAddress, results, clLoading, clPositions.length]);

  // Refresh now triggers CL fetch
  const onRefresh = async () => {
    if (!ownerAddress || !isConnected) return;
    try {
      setClLoading(true);
      setClError(null);
      const res = await fetch(`/api/cl-positions?owner=${ownerAddress}`);
      if (!res.ok) return;
      const data = await res.json();
      setClPositions(data?.positions || []);
    } catch (e) {
      setClError(e instanceof Error ? e.message : String(e));
    } finally {
      setClLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: 16, minHeight: '100vh', background: theme.bg, color: theme.text, transition: 'background 0.3s, color 0.3s' }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Aerodrome LP Checker</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.bgCard,
              color: theme.text,
              cursor: "pointer",
              fontSize: 16,
            }}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <Link href="/lp" style={{ textDecoration: "underline", color: theme.primary }}>English</Link>
          <Link href="/" style={{ textDecoration: "underline", color: theme.primary }}>Home</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ConnectWallet text="Connect Wallet (MetaMask / Rabby / CBW)" />
          {connectedAddress && (
            <button onClick={() => disconnect()} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.text, cursor: 'pointer' }}>
              Logout
            </button>
          )}
        </div>
        {/* Manual input removed: pairs auto-detected from wallet */}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={onRefresh} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, background: theme.text, color: theme.bg, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          {/* Share/Detect buttons removed for wallet-only UX */}
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: theme.text }}>
            <input type="checkbox" checked={onlyPositive} onChange={(e) => setOnlyPositive(e.target.checked)} />
            Show only positions I own
          </label>
          <span style={{ fontSize: 12, color: theme.textSecondary }}>
            {(() => {
              const remain = Math.max(0, Math.ceil((nextAllowedV2AtRef.current - Date.now()) / 1000));
              return remain > 0 ? `Retry in ${remain}s` : '';
            })()}
          </span>
        </div>
      </div>

      {!ownerAddress && (
        <div style={{ marginBottom: 16, padding: 12, background: theme.infoBg, border: `1px solid ${theme.infoBorder}`, borderRadius: 8 }}>
          Connect your wallet or provide an address via the <code style={{ background: theme.bgSecondary, padding: '2px 6px', borderRadius: 4 }}>view</code> query parameter.
        </div>
      )}

      {/* Error banner removed for cleaner UX; errors are silently retried/backed off */}

      {/* Portfolio Overview Cards */}
      {clPositions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> Portfolio Overview
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {/* Total Deposits */}
            {(() => {
              const activePositions = clPositions.filter(
                (p: any) => p.isActive && p.isInRange !== false
              );
              const totalDeposited = activePositions.reduce((sum, p: any) => {
                if (p.estimatedValueUSD) {
                  return sum + parseFloat(p.estimatedValueUSD);
                }
                return sum;
              }, 0);
              
              return (
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
                    ${totalDeposited.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary }}>
                    {activePositions.length} active position{activePositions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })()}

            {/* Total Earned (from staking rewards) */}
            {(() => {
              const stakedPositions = clPositions.filter((p: any) => p.isStaked && p.rewardPerYearUSD);
              const totalEarnedPerYear = stakedPositions.reduce((sum, p: any) => {
                return sum + parseFloat(p.rewardPerYearUSD || '0');
              }, 0);
              // Show daily earned for better granularity
              const totalEarnedPerDay = totalEarnedPerYear / 365.25;
              
              return (
                <div style={{ 
                  padding: 16, 
                  background: theme.bgCard, 
                  borderRadius: 12, 
                  border: `2px solid ${theme.border}`,
                  boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                    Daily Rewards
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: theme.success, marginBottom: 4 }}>
                    ${totalEarnedPerDay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary }}>
                    {stakedPositions.length} staked position{stakedPositions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })()}

            {/* Average APR */}
            {(() => {
              const stakedPositions = clPositions.filter((p: any) => p.isStaked && p.estimatedAPR);
              if (stakedPositions.length === 0) {
                return (
                  <div style={{ 
                    padding: 16, 
                    background: theme.bgCard, 
                    borderRadius: 12, 
                    border: `2px solid ${theme.border}`,
                    boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                      Avg APR
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: theme.textSecondary, marginBottom: 4 }}>
                      0%
                    </div>
                    <div style={{ fontSize: 13, color: theme.textSecondary }}>
                      No staked positions
                    </div>
                  </div>
                );
              }
              
              // Calculate weighted average APR
              let totalValueWeighted = 0;
              let totalValue = 0;
              stakedPositions.forEach((p: any) => {
                const value = parseFloat(p.estimatedValueUSD || '0');
                const aprStr = p.estimatedAPR || '0%';
                const apr = parseFloat(aprStr.replace('%', ''));
                totalValueWeighted += value * apr;
                totalValue += value;
              });
              const avgAPR = totalValue > 0 ? totalValueWeighted / totalValue : 0;
              
              return (
                <div style={{ 
                  padding: 16, 
                  background: theme.bgCard, 
                  borderRadius: 12, 
                  border: `2px solid ${theme.border}`,
                  boxShadow: darkMode ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>
                    Avg APR
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: theme.primary, marginBottom: 4 }}>
                    {avgAPR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary }}>
                    Size-weighted average
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Total Staking Rewards Summary */}
      {(() => {
        const stakedPositions = clPositions.filter((p: any) => p.isStaked && p.rewardRate);
        if (stakedPositions.length === 0) return null;
        
        // Calculate total rewards per second (all in USD)
        let totalRewardPerSecUSD = 0;
        stakedPositions.forEach((p: any) => {
          if (p.rewardPerYearUSD) {
            const yearlyUSD = parseFloat(p.rewardPerYearUSD);
            const perSecUSD = yearlyUSD / (365.25 * 24 * 3600);
            totalRewardPerSecUSD += perSecUSD;
          }
        });
        
        if (totalRewardPerSecUSD === 0) return null;
        
        const perDay = totalRewardPerSecUSD * 86400;
        const perWeek = totalRewardPerSecUSD * 86400 * 7;
        const perMonth = totalRewardPerSecUSD * 86400 * 30;
        const perYear = totalRewardPerSecUSD * 86400 * 365.25;
        
        return (
          <div style={{ 
            marginBottom: 16, 
            padding: 16, 
            background: theme.successBg, 
            border: `2px solid ${theme.successBorder}`, 
            borderRadius: 12,
            boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>🎁</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.success, margin: 0 }}>
                Aggregate Staking Rewards ({stakedPositions.length} active)
              </h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div style={{ padding: 12, background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Per Second</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.success }}>
                  ${totalRewardPerSecUSD.toFixed(6)}
                </div>
              </div>
              
              <div style={{ padding: 12, background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Per Day</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.success }}>
                  ${perDay.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              
              <div style={{ padding: 12, background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Per Week</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.success }}>
                  ${perWeek.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              
              <div style={{ padding: 12, background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Per Month</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.success }}>
                  ${perMonth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
              
              <div style={{ padding: 12, background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>Per Year</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.primary }}>
                  ${perYear.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gap: 12 }}>
        {loading && (
          <>
            <div style={{ height: 90, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
            <div style={{ height: 90, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
            <div style={{ height: 90, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
          </>
        )}
        {results.map((r) => (
          <div key={r.pairAddress} style={{ border: `1px solid ${theme.border}`, borderRadius: 10, padding: 12, background: theme.bgCard }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{r.pairSymbol}</div>
              <div style={{ color: theme.textSecondary, fontSize: 12 }}>{r.pairAddress}</div>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>LP Balance: {r.lpBalanceFormatted}</div>
            <div style={{ fontSize: 14, marginBottom: 6 }}>Share: {r.sharePercent}</div>
            {r.tvlUsd && (
              <div style={{ fontSize: 14, marginBottom: 6 }}>TVL (USD): ${r.tvlUsd}</div>
            )}
            {r.positionUsd && (
              <div style={{ fontSize: 14, marginBottom: 6 }}>Your Position (USD): ${r.positionUsd}</div>
            )}
            {r.aprPercent && (
              <div style={{ fontSize: 14, marginBottom: 6 }}>Est. Fee APR: {r.aprPercent}</div>
            )}
            <div style={{ display: "grid", gap: 4, fontSize: 14 }}>
              <div>Token0: {r.token0.symbol} — {r.token0.amountFormatted}</div>
              <div>Token1: {r.token1.symbol} — {r.token1.amountFormatted}</div>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div style={{ border: "1px dashed #ddd", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Concentrated Liquidity Positions</div>
            {clLoading && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
              </div>
            )}
            {clError && <div style={{ fontSize: 14, color: theme.warning }}>{clError}</div>}
            {!clLoading && clPositions.length === 0 && !clError && (
              <div style={{ fontSize: 14 }}>No CL positions found for this address.</div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {clPositions.filter((p) => !onlyPositive || (p.isActive && p.isInRange !== false)).map((p: any) => {
                const invert = !!invertMap[p.tokenId];
                const baseSym = invert ? (p.token1Symbol || 'Token1') : (p.token0Symbol || 'Token0');
                const quoteSym = invert ? (p.token0Symbol || 'Token0') : (p.token1Symbol || 'Token1');
                const cur = invert ? p.price0Per1 : p.price1Per0;
                const rMin = invert ? p.priceRange0Per1Min : p.priceRange1Per0Min;
                const rMax = invert ? p.priceRange0Per1Max : p.priceRange1Per0Max;
                
                return (
                <div key={p.tokenId} style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, background: theme.bgSecondary }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                        {p.pairSymbol || 'Unknown Pair'}
                      </div>
                      <div style={{ fontSize: 13, color: theme.textSecondary }}>Position #{p.tokenId}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ padding: '4px 10px', background: theme.bgCard, border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                        CL{p.tickSpacing}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  {p.isStaked && (
                    <div style={{ fontSize: 13, marginBottom: 10, padding: '8px 12px', background: theme.successBg, color: theme.success, borderRadius: 8, fontWeight: 600 }}>
                      🎁 Staked in gauge – earning rewards
                    </div>
                  )}
                  {p.isInRange === false && (
                    <div style={{ fontSize: 13, marginBottom: 10, padding: '8px 12px', background: theme.warningBg, color: theme.warning, borderRadius: 8 }}>
                      ⚠️ Current price is outside your range
                    </div>
                  )}
                  {(!p.isStaked && (p.liquidity === "0" || p.isActive === false)) && (
                    <div style={{ fontSize: 13, marginBottom: 10, padding: '8px 12px', background: theme.warningBg, color: theme.warning, borderRadius: 8 }}>
                      ⚠️ Withdrawn – No liquidity in pool
                    </div>
                  )}

                  {/* Token Amounts */}
                  {(p.estimatedAmount0 > 0 || p.estimatedAmount1 > 0) && (
                    <div style={{ marginBottom: 12, padding: '12px', background: theme.bgCard, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                      <div style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 6, fontWeight: 600 }}>Your Assets</div>
                      {p.estimatedAmount0 > 0 && (
                        <div style={{ fontSize: 14, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600 }}>{p.estimatedAmount0.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span> {p.token0Symbol || 'Token0'}
                          {p.token0PriceUSD && <span style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>(${p.token0PriceUSD})</span>}
                        </div>
                      )}
                      {p.estimatedAmount1 > 0 && (
                        <div style={{ fontSize: 14 }}>
                          <span style={{ fontWeight: 600 }}>{p.estimatedAmount1.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span> {p.token1Symbol || 'Token1'}
                          {p.token1PriceUSD && <span style={{ color: theme.textSecondary, fontSize: 12, marginLeft: 8 }}>(${p.token1PriceUSD})</span>}
                        </div>
                      )}
                      {p.estimatedValueUSD && (
                        <div style={{ fontSize: 15, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontWeight: 700, color: theme.primary }}>
                          ≈ ${parseFloat(p.estimatedValueUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rewards & APR for Staked Positions */}
                  {p.isStaked && (p.rewardRate || p.estimatedAPR) && (
                    <div style={{ marginBottom: 12, padding: '12px', background: theme.successBg, borderRadius: 8, border: `1px solid ${theme.successBorder}` }}>
                      <div style={{ fontSize: 12, color: theme.success, marginBottom: 6, fontWeight: 700 }}>🎁 Staking Rewards</div>
                      {p.estimatedAPR && (
                        <div style={{ fontSize: 18, fontWeight: 700, color: theme.success, marginBottom: 6 }}>
                          APR: {p.estimatedAPR}
                        </div>
                      )}
                      
                      {/* Reward Rate Grid */}
                      {p.rewardRate && p.rewardPerYearUSD && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Second</div>
                            <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                              {p.rewardRate} {p.rewardSymbol || 'tokens'}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Day</div>
                            <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                              {p.rewardPerDay} {p.rewardSymbol || 'tokens'}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Week</div>
                            <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                              {(parseFloat(p.rewardPerDay) * 7).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {p.rewardSymbol || 'tokens'}
                            </div>
                          </div>
                          
                          <div>
                            <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Year (USD)</div>
                            <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                              ${parseFloat(p.rewardPerYearUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Info */}
                  {cur !== undefined && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: theme.textSecondary, fontWeight: 600 }}>Current Price</div>
                        <button
                          onClick={() => setInvertMap((m) => ({ ...m, [p.tokenId]: !invert }))}
                          style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: `1px solid ${theme.border}`, background: theme.bgCard, color: theme.text, cursor: 'pointer' }}
                        >
                          1 {baseSym}
                        </button>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {cur.toLocaleString()} {quoteSym}
                      </div>
                    </div>
                  )}

                  {/* Price Range */}
                  {(rMin !== undefined && rMax !== undefined) && (
                    <div style={{ padding: '12px', background: darkMode ? '#1a3a52' : '#e3f2fd', borderRadius: 8, marginBottom: 12 }}>
                      <div style={{ fontSize: 12, color: theme.primary, marginBottom: 6, fontWeight: 600 }}>Price Range</div>
                      <div style={{ fontSize: 14, color: theme.primary }}>
                        {rMin.toLocaleString()} ~ {rMax.toLocaleString()} {quoteSym} per 1 {baseSym}
                      </div>
                    </div>
                  )}

                  {/* Pool Address (Collapsible) */}
                  <details style={{ marginTop: 12, fontSize: 12, color: theme.textSecondary }}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none' }}>Details</summary>
                    <div style={{ marginTop: 8, padding: '8px', background: theme.bgCard, borderRadius: 6, fontFamily: 'monospace' }}>
                      <div>Pool: {p.pool}</div>
                      <div>Token0: {p.token0}</div>
                      <div>Token1: {p.token1}</div>
                      <div>Tick Range: [{p.tickLower}, {p.tickUpper}]</div>
                      {p.slot0 && <div>Current Tick: {p.slot0.tick}</div>}
                      <div>Liquidity: {p.liquidity}</div>
                    </div>
                  </details>
                </div>
              )})}
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        @keyframes pulse { 0% { opacity: .6 } 50% { opacity: 1 } 100% { opacity: .6 } }
      `}</style>
      {copied && (
        <div style={{ position: 'fixed', right: 16, bottom: 16, background: darkMode ? '#333' : '#111', color: '#fff', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          Copied!
        </div>
      )}
    </div>
  );
}
