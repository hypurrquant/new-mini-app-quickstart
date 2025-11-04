"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { publicClient } from "../../lib/viemClient";
import { AERODROME_PAIR_ABI, ERC20_ABI } from "../../lib/abis";
import { Address, formatUnits, isAddress } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import Link from "next/link";
import { getAttendanceData } from "../../lib/points";

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

function LpCheckerPageContent() {
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
  const [tickClock, setTickClock] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [sortBy, setSortBy] = useState<'value' | 'apr' | 'daily' | 'pair'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressInput, setAddressInput] = useState("");
  const [addressError, setAddressError] = useState("");
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setShowWalletMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (guideRef.current && !guideRef.current.contains(event.target as Node)) {
        setShowGuide(false);
      }
      if (showRewards && !document.getElementById('rewards-modal')?.contains(event.target as Node)) {
        setShowRewards(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRewards]);

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

  // Refresh now triggers CL fetch (silent refresh if data exists)
  const onRefresh = async (silent = false) => {
    if (!ownerAddress || !isConnected) return;
    try {
      // Only show loading skeleton if no positions exist yet
      if (!silent && clPositions.length === 0) {
        setClLoading(true);
      }
      setClError(null);
      const res = await fetch(`/api/cl-positions?owner=${ownerAddress}`);
      if (!res.ok) return;
      const data = await res.json();
      setClPositions(data?.positions || []);
    } catch (e) {
      setClError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent && clPositions.length === 0) {
        setClLoading(false);
      }
    }
  };

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!ownerAddress || !isConnected) {
      // Clear interval when wallet disconnects
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
      return;
    }

    // Set up auto-refresh
    autoRefreshInterval.current = setInterval(() => {
      onRefresh(true); // Silent refresh
    }, 60000); // 60 seconds

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
  }, [ownerAddress, isConnected]);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === 0 || window.scrollY > 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    if (distance > 0 && distance < 150) {
      setIsPulling(true);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance > 80) {
      onRefresh(false);
    }
    setIsPulling(false);
    setPullDistance(0);
    touchStartY.current = 0;
  };

  return (
    <div 
      style={{ maxWidth: 840, margin: "0 auto", padding: 16, minHeight: '100vh', background: theme.bg, color: theme.text, transition: 'background 0.3s, color 0.3s', position: 'relative' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: pullDistance,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: theme.bgCard,
          zIndex: 1000,
          transition: 'opacity 0.2s',
          opacity: pullDistance > 80 ? 1 : 0.5,
        }}>
          <div style={{
            fontSize: 24,
            transform: `rotate(${pullDistance * 3}deg)`,
            transition: 'transform 0.1s',
          }}>
            {pullDistance > 80 ? '🔄' : '⬇️'}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <div style={{ 
            fontSize: 24, 
            fontWeight: 800, 
            backgroundImage: darkMode 
              ? 'linear-gradient(135deg, #42a5f5 0%, #81c784 100%)'
              : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            LPing
          </div>
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Guide Button */}
          <button
            onClick={() => setShowGuide(!showGuide)}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.bgCard,
              color: theme.text,
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
            }}
            title="Guide"
          >
            ?
          </button>
          
          {/* Wallet Button with Dropdown */}
          <div style={{ position: 'relative' }} ref={walletMenuRef}>
            {connectedAddress ? (
              <>
                <button
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `2px solid ${theme.success}`,
                    background: theme.bgCard,
                    color: theme.text,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🟢 {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                </button>
                
                {showWalletMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: theme.bgCard,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 12,
                    boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
                    minWidth: 240,
                    zIndex: 100,
                  }}>
                    <div style={{ 
                      padding: '12px 16px', 
                      borderBottom: `1px solid ${theme.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Connected Wallet</div>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                          {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(connectedAddress);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        style={{
                          padding: '6px 8px',
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 16,
                        }}
                        title="Copy full address"
                      >
                        📋
                      </button>
                    </div>
                    
                    <button
                      onClick={() => {
                        disconnect();
                        setShowWalletMenu(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: theme.warning,
                        cursor: 'pointer',
                        fontSize: 14,
                        textAlign: 'left',
                        borderRadius: '0 0 12px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.warningBg}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🚪 Disconnect
                    </button>
                  </div>
                )}
              </>
            ) : (
              <ConnectWallet />
            )}
          </div>
          
          {/* Settings Menu Button */}
          <div style={{ position: 'relative' }} ref={settingsMenuRef}>
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: `1px solid ${theme.border}`,
                background: theme.bgCard,
                color: theme.text,
                cursor: "pointer",
                fontSize: 20,
                fontWeight: 600,
                lineHeight: 1,
              }}
              title="Settings"
            >
              ⋮
            </button>
            
            {showSettingsMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 8,
                background: theme.bgCard,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                boxShadow: darkMode ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.15)',
                minWidth: 180,
                zIndex: 100,
              }}>
                {/* Dark Mode Toggle */}
                <button
                  onClick={() => {
                    setDarkMode(!darkMode);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.text,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
                </button>
                
                {/* Rewards */}
                <button
                  onClick={() => {
                    setShowRewards(true);
                    setShowSettingsMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.text,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🎁 Rewards
                </button>
                
                {/* Docs */}
                <a
                  href="https://docs.base.org" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.border}`,
                    color: theme.text,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📚 Docs
                </a>
                
                {/* Home Link */}
                <Link 
                  href="/" 
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    color: theme.text,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textDecoration: 'none',
                    borderRadius: '0 0 12px 12px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  🏠 Home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Error banner removed for cleaner UX; errors are silently retried/backed off */}

      {/* Portfolio Overview Cards */}
      {clPositions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> Portfolio Overview
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {/* Total Deposits */}
            {(() => {
              const activePositions = clPositions.filter((p: any) => p.isActive);
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

            {/* Total Claimable Rewards + Expected Daily */}
            {(() => {
              const stakedPositions = clPositions.filter((p: any) => p.isStaked);
              
              // Calculate total claimable (earned) rewards
              const totalClaimable = stakedPositions.reduce((sum, p: any) => {
                return sum + parseFloat(p.earnedAmountUSD || '0');
              }, 0);
              
              // Calculate expected daily earnings
              const totalEarnedPerYear = stakedPositions.reduce((sum, p: any) => {
                return sum + parseFloat(p.rewardPerYearUSD || '0');
              }, 0);
              const expectedDaily = totalEarnedPerYear / 365.25;
              
              return (
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
                    ${totalClaimable.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 6 }}>
                    Ready to claim
                  </div>
                  {expectedDaily > 0 && (
                    <div style={{ fontSize: 12, color: theme.textSecondary, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                      Expected: <span style={{ fontWeight: 600, color: theme.success }}>${expectedDaily.toFixed(2)}/day</span>
                    </div>
                  )}
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
                      Average APR
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
                    Average APR
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: theme.primary, marginBottom: 4 }}>
                    {avgAPR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}%
                  </div>
                  <div style={{ fontSize: 13, color: theme.textSecondary }}>
                    weighted by position size
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

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
          <div style={{ border: `1px dashed ${theme.border}`, borderRadius: 10, padding: 12, background: theme.bgCard }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Concentrated Liquidity Positions</div>
              
              {/* Sort Controls */}
              {clPositions.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bgCard,
                      color: theme.text,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="value">Sort by Value</option>
                    <option value="apr">Sort by APR</option>
                    <option value="daily">Sort by Daily Rewards</option>
                    <option value="pair">Sort by Pair</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      background: theme.bgCard,
                      color: theme.text,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              )}
            </div>
            {clLoading && (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
                <div style={{ height: 80, borderRadius: 10, background: theme.skeleton, animation: 'pulse 1.2s ease-in-out infinite' }} />
              </div>
            )}
            {clError && <div style={{ fontSize: 14, color: theme.warning }}>{clError}</div>}
            {!clLoading && clPositions.length === 0 && !clError && (
              <div style={{ 
                padding: 32, 
                textAlign: 'center',
                background: theme.bgCard,
                borderRadius: 12,
                border: `2px dashed ${theme.border}`,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  No CL positions found for this owner
                </div>
                <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24 }}>
                  {ownerAddress ? (
                    <>Connected wallet has no Aerodrome CL positions</>
                  ) : (
                    <>Connect your wallet or search by address</>
                  )}
                </div>
                
                {!showAddressInput ? (
                  <button
                    onClick={() => setShowAddressInput(true)}
                    style={{
                      padding: '12px 24px',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#ffffff',
                      background: theme.primary,
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = darkMode 
                        ? '0 4px 12px rgba(66, 165, 245, 0.3)' 
                        : '0 4px 12px rgba(25, 118, 210, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    🔎 Search by Address
                  </button>
                ) : (
                  <div style={{ maxWidth: 500, margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        placeholder="Enter wallet address (0x...)"
                        value={addressInput}
                        onChange={(e) => {
                          setAddressInput(e.target.value);
                          setAddressError("");
                        }}
                        style={{
                          flex: 1,
                          padding: '12px 16px',
                          fontSize: 14,
                          border: `1px solid ${addressError ? theme.warning : theme.border}`,
                          borderRadius: 8,
                          background: theme.bgCard,
                          color: theme.text,
                          outline: 'none',
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const addr = addressInput.trim();
                            if (!addr) {
                              setAddressError("Please enter an address");
                              return;
                            }
                            if (!isAddress(addr)) {
                              setAddressError("Invalid address format");
                              return;
                            }
                            // Navigate with view parameter
                            window.location.href = `/lp?view=${addr}`;
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const addr = addressInput.trim();
                          if (!addr) {
                            setAddressError("Please enter an address");
                            return;
                          }
                          if (!isAddress(addr)) {
                            setAddressError("Invalid address format");
                            return;
                          }
                          // Navigate with view parameter
                          window.location.href = `/lp?view=${addr}`;
                        }}
                        style={{
                          padding: '12px 24px',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#ffffff',
                          background: theme.primary,
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        Search
                      </button>
                      <button
                        onClick={() => {
                          setShowAddressInput(false);
                          setAddressInput("");
                          setAddressError("");
                        }}
                        style={{
                          padding: '12px 16px',
                          fontSize: 14,
                          fontWeight: 600,
                          color: theme.textSecondary,
                          background: theme.bgSecondary,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    {addressError && (
                      <div style={{ fontSize: 12, color: theme.warning, textAlign: 'left' }}>
                        {addressError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Sorted and filtered positions */}
            {(() => {
              // Show all active positions (inactive ones are handled by isActive flag)
              let filtered = clPositions.filter((p) => p.isActive);
              
              // Sort positions
              const sorted = [...filtered].sort((a: any, b: any) => {
                let aVal, bVal;
                switch (sortBy) {
                  case 'value':
                    aVal = parseFloat(a.estimatedValueUSD || '0');
                    bVal = parseFloat(b.estimatedValueUSD || '0');
                    break;
                  case 'apr':
                    aVal = parseFloat((a.estimatedAPR || '0%').replace('%', ''));
                    bVal = parseFloat((b.estimatedAPR || '0%').replace('%', ''));
                    break;
                  case 'daily':
                    aVal = a.rewardPerYearUSD ? parseFloat(a.rewardPerYearUSD) / 365.25 : 0;
                    bVal = b.rewardPerYearUSD ? parseFloat(b.rewardPerYearUSD) / 365.25 : 0;
                    break;
                  case 'pair':
                    aVal = a.pairSymbol || '';
                    bVal = b.pairSymbol || '';
                    if (typeof aVal === 'string') {
                      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    }
                    break;
                  default:
                    return 0;
                }
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
              });
              
              const toggleExpand = (tokenId: string) => {
                const newExpanded = new Set(expandedPositions);
                if (newExpanded.has(tokenId)) {
                  newExpanded.delete(tokenId);
                } else {
                  newExpanded.add(tokenId);
                }
                setExpandedPositions(newExpanded);
              };
              
              // Render positions as table with expandable rows
              return (
                <div style={{ marginTop: 16 }}>
                  {/* Table */}
                  <div style={{ 
                    border: `1px solid ${theme.border}`, 
                    borderRadius: 12, 
                    overflow: 'hidden',
                    background: theme.bgCard 
                  }}>
                    {/* Table Header */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '2fr 1fr 1.5fr 1.2fr 1fr 1fr',
                      padding: '12px 16px',
                      background: theme.bgSecondary,
                      fontWeight: 600,
                      fontSize: 13,
                      color: theme.textSecondary,
                      borderBottom: `1px solid ${theme.border}`,
                    }}>
                      <div>Pair</div>
                      <div style={{ textAlign: 'right' }}>Value (USD)</div>
                      <div style={{ textAlign: 'right' }}>Price Range</div>
                      <div style={{ textAlign: 'right' }}>Earned (USD)</div>
                      <div style={{ textAlign: 'right' }}>APR</div>
                      <div style={{ textAlign: 'right' }}>Status</div>
                    </div>
                    
                    {/* Table Body */}
                    {sorted.map((p: any) => {
                const invert = !!invertMap[p.tokenId];
                const baseSym = invert ? (p.token1Symbol || 'Token1') : (p.token0Symbol || 'Token0');
                const quoteSym = invert ? (p.token0Symbol || 'Token0') : (p.token1Symbol || 'Token1');
                const cur = invert ? p.price0Per1 : p.price1Per0;
                const rMin = invert ? p.priceRange0Per1Min : p.priceRange1Per0Min;
                const rMax = invert ? p.priceRange0Per1Max : p.priceRange1Per0Max;
                const isExpanded = expandedPositions.has(p.tokenId);
                
                return (
                  <div key={p.tokenId}>
                    {/* Table Row */}
                    <div 
                      onClick={() => toggleExpand(p.tokenId)}
                      style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '2fr 1fr 1.5fr 1.2fr 1fr 1fr',
                        padding: '12px 16px',
                        borderBottom: isExpanded ? 'none' : `1px solid ${theme.border}`,
                        cursor: 'pointer',
                        background: isExpanded ? theme.bgSecondary : 'transparent',
                        transition: 'background 0.2s',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
                      onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? theme.bgSecondary : 'transparent'}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {p.pairSymbol || 'Unknown Pair'}
                        <span style={{ 
                          marginLeft: 8, 
                          padding: '2px 6px', 
                          background: theme.bgCard, 
                          border: `1px solid ${theme.border}`, 
                          borderRadius: 4, 
                          fontSize: 11, 
                          fontWeight: 600 
                        }}>
                          CL{p.tickSpacing}
                        </span>
                        <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>#{p.tokenId}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 600 }}>
                        {p.estimatedValueUSD ? `$${parseFloat(p.estimatedValueUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                      </div>
                      <div 
                        style={{ textAlign: 'right', fontSize: 12, cursor: 'pointer', padding: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const newInvertMap = { ...invertMap };
                          newInvertMap[p.tokenId] = !invert;
                          setInvertMap(newInvertMap);
                        }}
                        title="Click to flip price display"
                      >
                        {rMin && rMax ? (
                          <>
                            <div style={{ fontWeight: 600, color: theme.primary }}>
                              {cur ? cur.toFixed(2) : '-'}
                            </div>
                            <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                              {rMin.toFixed(0)} ~ {rMax.toFixed(0)}
                            </div>
                            <div style={{ fontSize: 9, color: theme.textSecondary, marginTop: 2, fontStyle: 'italic' }}>
                              {quoteSym}/{baseSym} ↻
                            </div>
                          </>
                        ) : '-'}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, color: p.earnedAmountUSD ? theme.success : theme.textSecondary }}>
                        {p.earnedAmountUSD ? `$${parseFloat(p.earnedAmountUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 600, color: p.estimatedAPR ? theme.success : theme.textSecondary }}>
                        {p.estimatedAPR || '-'}
                      </div>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                        {/* Staking Status */}
                        {p.isStaked ? (
                          <span style={{ 
                            padding: '3px 8px', 
                            background: theme.successBg, 
                            color: theme.success, 
                            borderRadius: 4, 
                            fontSize: 11, 
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            🟢 Staked
                          </span>
                        ) : (
                          <span style={{ 
                            padding: '3px 8px', 
                            background: theme.bgSecondary, 
                            color: theme.textSecondary, 
                            border: `1px solid ${theme.border}`,
                            borderRadius: 4, 
                            fontSize: 11,
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            ⚪ Unstaked
                          </span>
                        )}
                        
                        {/* Position Active Status (In Range / Out of Range) */}
                        {(() => {
                          // Check if position is in range
                          const inRangeCheck = p.slot0 && p.slot0.tick >= p.tickLower && p.slot0.tick <= p.tickUpper;
                          
                          if (inRangeCheck) {
                            return (
                              <span style={{ 
                                padding: '3px 8px', 
                                background: darkMode ? '#1a4d2e' : '#e8f5e9', 
                                color: darkMode ? '#4caf50' : '#2e7d32', 
                                borderRadius: 4, 
                                fontSize: 10,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                ✓ In Range
                              </span>
                            );
                          } else {
                            return (
                              <span style={{ 
                                padding: '3px 8px', 
                                background: theme.warningBg, 
                                color: theme.warning, 
                                borderRadius: 4, 
                                fontSize: 10,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}>
                                ⚠ Out of Range
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>
                    
                    {/* Expanded Card */}
                    {isExpanded && (
                      <div style={{ 
                        padding: 16, 
                        background: theme.bgSecondary,
                        borderBottom: `1px solid ${theme.border}`,
                      }}>
                        {/* Card Content */}
                <div key={p.tokenId} style={{ borderRadius: 12, padding: 16, background: theme.bgCard }}>
                  {/* Status Badges */}
                  {p.isStaked && (
                    <div style={{ fontSize: 13, marginBottom: 10, padding: '8px 12px', background: theme.successBg, color: theme.success, borderRadius: 8, fontWeight: 600 }}>
                      🎁 Staked in Gauge – Earning Rewards
                    </div>
                  )}
                  {p.isActive === false && !p.isStaked && (
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
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{p.estimatedAmount0.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span> {p.token0Symbol || 'Token0'}
                            </div>
                            {p.token0PriceUSD && (
                              <div style={{ color: theme.textSecondary, fontSize: 13, fontWeight: 600 }}>
                                ${(p.estimatedAmount0 * parseFloat(p.token0PriceUSD)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            )}
                          </div>
                          {p.token0PriceUSD && (
                            <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                              @ ${parseFloat(p.token0PriceUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}
                            </div>
                          )}
                        </div>
                      )}
                      {p.estimatedAmount1 > 0 && (
                        <div style={{ fontSize: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontWeight: 600 }}>{p.estimatedAmount1.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span> {p.token1Symbol || 'Token1'}
                            </div>
                            {p.token1PriceUSD && (
                              <div style={{ color: theme.textSecondary, fontSize: 13, fontWeight: 600 }}>
                                ${(p.estimatedAmount1 * parseFloat(p.token1PriceUSD)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            )}
                          </div>
                          {p.token1PriceUSD && (
                            <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
                              @ ${parseFloat(p.token1PriceUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}
                            </div>
                          )}
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
                      <div style={{ fontSize: 12, color: theme.success, marginBottom: 8, fontWeight: 700 }}>🎁 My Staking Rewards</div>
                      
                      {/* Earned Amount */}
                      {p.earnedAmount && (
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>Earned (Ready to Claim)</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: theme.success }}>
                            {parseFloat(p.earnedAmount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} {p.earnedSymbol || 'tokens'}
                            {p.earnedAmountUSD && <span style={{ fontSize: 14, marginLeft: 8, color: theme.textSecondary }}>≈ ${parseFloat(p.earnedAmountUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>}
                          </div>
                        </div>
                      )}
                      
                      {p.estimatedAPR && (
                        <div style={{ fontSize: 18, fontWeight: 700, color: theme.success, marginBottom: 6 }}>
                          My APR: {p.estimatedAPR}
                        </div>
                      )}
                      
                      {/* My Expected Earnings */}
                      {p.rewardRate && p.rewardPerYearUSD && (
                        <>
                          <div style={{ fontSize: 11, color: theme.success, marginTop: 8, marginBottom: 4, opacity: 0.8 }}>My Expected Earnings</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Day</div>
                              <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                                ${parseFloat(p.rewardPerDay).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Week</div>
                              <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                                ${p.rewardPerWeek ? parseFloat(p.rewardPerWeek).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : (parseFloat(p.rewardPerDay) * 7).toFixed(2)}
                              </div>
                            </div>
                            
                            <div>
                              <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Month (30d)</div>
                              <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                                ${(parseFloat(p.rewardPerDay) * 30).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 11, color: theme.success, opacity: 0.8 }}>Per Year</div>
                              <div style={{ fontSize: 13, color: theme.success, fontWeight: 600 }}>
                                ${parseFloat(p.rewardPerYearUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </div>
                            </div>
                          </div>
                        </>
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
                      <div style={{ fontSize: 12, color: theme.primary, marginBottom: 6, fontWeight: 600 }}>Your Price Range</div>
                      <div style={{ fontSize: 14, color: theme.primary }}>
                        {rMin.toLocaleString()} ~ {rMax.toLocaleString()} {quoteSym} per 1 {baseSym}
                      </div>
                    </div>
                  )}

                  {/* Pool Statistics & Position Details */}
                  <details style={{ marginTop: 12, fontSize: 12, color: theme.textSecondary }}>
                    <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600 }}>🔧 Technical Details</summary>
                    <div style={{ marginTop: 8, padding: '12px', background: theme.bgSecondary, borderRadius: 8, display: 'grid', gap: 12 }}>
                      
                      {/* Pool Statistics (Phase 1) - Only show if data exists */}
                      {(p.poolTVL || p.poolVolume24h || p.poolFees24h) && (
                        <div style={{ padding: '12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: theme.primary }}>🏊 Pool Statistics</div>
                          {p.poolTVL && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>Total TVL:</span>
                              <span style={{ fontWeight: 600 }}>${parseFloat(p.poolTVL).toLocaleString()}</span>
                            </div>
                          )}
                          {p.poolVolume24h && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>24h Volume:</span>
                              <span style={{ fontWeight: 600 }}>${parseFloat(p.poolVolume24h).toLocaleString()}</span>
                            </div>
                          )}
                          {p.poolVolume7d && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>7d Volume:</span>
                              <span style={{ fontWeight: 600 }}>${parseFloat(p.poolVolume7d).toLocaleString()}</span>
                            </div>
                          )}
                          {p.poolFees24h && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>24h Fees:</span>
                              <span style={{ fontWeight: 600, color: theme.success }}>${parseFloat(p.poolFees24h).toLocaleString()}</span>
                            </div>
                          )}
                          {p.poolFees7d && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>7d Fees:</span>
                              <span style={{ fontWeight: 600, color: theme.success }}>${parseFloat(p.poolFees7d).toLocaleString()}</span>
                            </div>
                          )}
                          {p.poolFeeAPR && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                              <span style={{ fontWeight: 600 }}>Fee APR:</span>
                              <span style={{ fontWeight: 700, color: theme.primary }}>{p.poolFeeAPR}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Pool Reward Info - Show for staked positions */}
                      {p.isStaked && p.poolRewardRate && (
                        <div style={{ padding: '12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: theme.success }}>🎁 Pool Reward Distribution</div>
                          <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
                            Total rewards emitted by this Gauge (shared among all LPs)
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Reward Token:</span>
                            <span style={{ fontWeight: 600 }}>{p.poolRewardSymbol || 'Unknown'}</span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>Rate (per second):</span>
                            <span style={{ fontWeight: 600 }}>{parseFloat(p.poolRewardRate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} {p.poolRewardSymbol}</span>
                          </div>
                          
                          {p.poolRewardPriceUSD && parseFloat(p.poolRewardPriceUSD) > 0 && (
                            <>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Token Price:</span>
                                <span style={{ fontWeight: 600 }}>${parseFloat(p.poolRewardPriceUSD).toLocaleString()}</span>
                              </div>
                              
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                                <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>Total Pool Rewards</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 12 }}>
                                  <div>
                                    <div style={{ color: theme.textSecondary }}>Per Day</div>
                                    <div style={{ fontWeight: 600, color: theme.success }}>${(parseFloat(p.poolRewardRate) * parseFloat(p.poolRewardPriceUSD) * 86400).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                    <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                                      {(parseFloat(p.poolRewardRate) * 86400).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} {p.poolRewardSymbol}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ color: theme.textSecondary }}>Per Week</div>
                                    <div style={{ fontWeight: 600, color: theme.success }}>${(parseFloat(p.poolRewardRate) * parseFloat(p.poolRewardPriceUSD) * 604800).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
                                    <div style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                                      {(parseFloat(p.poolRewardRate) * 604800).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})} {p.poolRewardSymbol}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {p.estimatedValueUSD && parseFloat(p.estimatedValueUSD) > 0 && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 11, color: theme.textSecondary }}>
                                  💡 Your share: {p.myLiquidityProportion || "0%"} of pool's staked liquidity
                                  {p.myLiquidityProportion && (
                                    <div style={{ marginTop: 4 }}>
                                      You earn {p.myLiquidityProportion} of the pool rewards shown above
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Position Details (Phase 2) - Only show if data exists */}
                      {(p.positionAge || p.collectedFees0 || p.roi) && (
                        <div style={{ padding: '12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: theme.primary }}>📈 Position History</div>
                          {p.positionAge !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>Position Age:</span>
                              <span style={{ fontWeight: 600 }}>{p.positionAge} days</span>
                            </div>
                          )}
                          {p.collectedFeesUSD && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span>Collected Fees (Total):</span>
                              <span style={{ fontWeight: 600, color: theme.success }}>${parseFloat(p.collectedFeesUSD).toLocaleString()}</span>
                            </div>
                          )}
                          {p.collectedFees0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: theme.textSecondary }}>
                              <span>├─ {p.collectedFees0Symbol}:</span>
                              <span>{parseFloat(p.collectedFees0).toLocaleString()}</span>
                            </div>
                          )}
                          {p.collectedFees1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: theme.textSecondary }}>
                              <span>└─ {p.collectedFees1Symbol}:</span>
                              <span>{parseFloat(p.collectedFees1).toLocaleString()}</span>
                            </div>
                          )}
                          {p.roi && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                              <span style={{ fontWeight: 600 }}>ROI (Fees/Deposit):</span>
                              <span style={{ fontWeight: 700, color: parseFloat(p.roi) > 0 ? theme.success : theme.textSecondary }}>{p.roi}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Unclaimed Fees (from SugarHelper) */}
                      {(p.unclaimedFees0 || p.unclaimedFees1) && (parseFloat(p.unclaimedFees0 || "0") > 0 || parseFloat(p.unclaimedFees1 || "0") > 0) && (
                        <div style={{ padding: '12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: theme.success }}>💰 Unclaimed Trading Fees</div>
                          <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 8 }}>
                            Fees ready to collect (from SugarHelper - more accurate)
                          </div>
                          
                          {p.unclaimedFeesUSD && parseFloat(p.unclaimedFeesUSD) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontWeight: 600 }}>
                              <span>Total Value:</span>
                              <span style={{ color: theme.success }}>${parseFloat(p.unclaimedFeesUSD).toLocaleString()}</span>
                            </div>
                          )}
                          
                          {p.unclaimedFees0 && parseFloat(p.unclaimedFees0) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                              <span>{p.unclaimedFees0Symbol}:</span>
                              <span>{parseFloat(p.unclaimedFees0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span>
                            </div>
                          )}
                          
                          {p.unclaimedFees1 && parseFloat(p.unclaimedFees1) > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                              <span>{p.unclaimedFees1Symbol}:</span>
                              <span>{parseFloat(p.unclaimedFees1).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</span>
                            </div>
                          )}
                          
                          {p.calculatedBy && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}`, fontSize: 10, color: theme.textSecondary }}>
                              ✅ Calculated using {p.calculatedBy} for accuracy
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Technical Details - Always show */}
                      <div style={{ padding: '12px', background: theme.bgCard, borderRadius: 6, border: `1px solid ${theme.border}` }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, color: theme.textSecondary }}>Contract Addresses</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>Pool</div>
                            <div>{p.pool}</div>
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>Token0 ({p.token0Symbol})</div>
                            <div>{p.token0}</div>
                          </div>
                          <div style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: theme.textSecondary, marginBottom: 2 }}>Token1 ({p.token1Symbol})</div>
                            <div>{p.token1}</div>
                          </div>
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.border}` }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 10, color: theme.textSecondary }}>Tick Range</div>
                                <div>[{p.tickLower}, {p.tickUpper}]</div>
                              </div>
                              {p.slot0 && (
                                <div>
                                  <div style={{ fontSize: 10, color: theme.textSecondary }}>Current Tick</div>
                                  <div>{p.slot0.tick}</div>
                                </div>
                              )}
                            </div>
                            <div style={{ marginTop: 6 }}>
                              <div style={{ fontSize: 10, color: theme.textSecondary }}>Liquidity</div>
                              <div>{p.liquidity}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
                      </div>
                    )}
                  </div>
                );
              })}
                  </div>
                </div>
              );
            })()}
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
      
      {/* Guide Popup */}
      {showGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 16,
        }}>
          <div
            ref={guideRef}
            style={{
              background: theme.bgCard,
              borderRadius: 16,
              padding: 24,
              maxWidth: 600,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📖 LPing Guide</h2>
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: theme.text,
                  padding: 4,
                }}
              >
                ×
              </button>
            </div>
            
            {/* Guide Content */}
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Section 1 */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: theme.primary }}>🔐 Connect Your Wallet</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0 }}>
                  Click the "Connect" button in the top right to connect your wallet. Your LP positions will be automatically loaded.
                </p>
              </div>
              
              {/* Section 2 */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: theme.primary }}>📊 View Your Positions</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0 }}>
                  See all your Aerodrome Concentrated Liquidity positions in a table view with:
                </p>
                <ul style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, marginTop: 8, paddingLeft: 20 }}>
                  <li><strong>Value:</strong> Total USD value of your position</li>
                  <li><strong>Earned:</strong> Rewards you've accumulated (ready to claim)</li>
                  <li><strong>APR:</strong> Annual Percentage Rate for staked positions</li>
                  <li><strong>Status:</strong> 🟢 Staked, Active, or ⚠️ Inactive</li>
                </ul>
              </div>
              
              {/* Section 3 */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: theme.primary }}>🔍 Position Details</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0 }}>
                  Click any row in the table to expand and see detailed information:
                </p>
                <ul style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, marginTop: 8, paddingLeft: 20 }}>
                  <li><strong>Your Assets:</strong> Token amounts and USD values</li>
                  <li><strong>Staking Rewards:</strong> Earned amount and expected earnings (daily/weekly/monthly/yearly)</li>
                  <li><strong>Current Price:</strong> Real-time price information</li>
                  <li><strong>Price Range:</strong> Your selected liquidity range</li>
                </ul>
              </div>
              
              {/* Section 4 */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: theme.primary }}>🎁 Staking Rewards</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0 }}>
                  For staked positions, you'll see:
                </p>
                <ul style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, marginTop: 8, paddingLeft: 20 }}>
                  <li><strong>Earned:</strong> Current claimable rewards in USD</li>
                  <li><strong>Expected Earnings:</strong> Future rewards based on current APR (per day/week/month/year)</li>
                  <li><strong>APR:</strong> Annual percentage rate for your staked position</li>
                </ul>
              </div>
              
              {/* Section 5 */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: theme.primary }}>⚙️ Features</h3>
                <ul style={{ fontSize: 14, lineHeight: 1.6, color: theme.textSecondary, margin: 0, paddingLeft: 20 }}>
                  <li><strong>Auto-Refresh:</strong> Positions update automatically every 60 seconds</li>
                  <li><strong>Pull-to-Refresh:</strong> Swipe down from the top to manually refresh</li>
                  <li><strong>Sort:</strong> Use the dropdown to sort by Value, APR, Earned, or Pair name</li>
                  <li><strong>Dark Mode:</strong> Toggle in settings menu (⋮)</li>
                  <li><strong>Language:</strong> Switch to Korean in settings menu</li>
                </ul>
              </div>
              
              {/* Section 6 */}
              <div style={{ padding: '12px', background: theme.successBg, borderRadius: 8, border: `1px solid ${theme.successBorder}` }}>
                <p style={{ fontSize: 13, lineHeight: 1.5, color: theme.success, margin: 0, fontWeight: 600 }}>
                  💡 <strong>Tip:</strong> This is a read-only tool to monitor your LP positions. To manage your positions (add/remove liquidity, claim rewards), visit the official Aerodrome Finance app.
                </p>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${theme.border}`, textAlign: 'center' }}>
              <button
                onClick={() => setShowGuide(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: theme.primary,
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Modal */}
      {showRewards && (
        <div
          id="rewards-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowRewards(false)}
        >
          <div
            style={{
              background: theme.bgCard,
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '100%',
              boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: theme.text }}>🎁 Rewards</h2>
              <button
                onClick={() => setShowRewards(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 24,
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '48px 24px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 64,
                marginBottom: 24,
              }}>
                🎁
              </div>
              <div style={{
                fontSize: 32,
                fontWeight: 700,
                marginBottom: 12,
                backgroundImage: darkMode 
                  ? 'linear-gradient(135deg, #42a5f5 0%, #81c784 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Coming Soon
              </div>
              <div style={{
                fontSize: 16,
                color: theme.textSecondary,
                lineHeight: 1.6,
              }}>
                We're working on something amazing.<br />
                Stay tuned for exciting rewards!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LpCheckerPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading...</div>}>
      <LpCheckerPageContent />
    </Suspense>
  );
}
