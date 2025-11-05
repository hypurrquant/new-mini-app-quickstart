import { useState, useEffect, useRef, useCallback } from "react";
import { Address, isAddress } from "viem";
import type { CLPosition } from "../types";

const AUTO_FETCH_COOLDOWN_MS = Number(process.env.NEXT_PUBLIC_LP_COOLDOWN_MS ?? "15000");
const FAIL_BACKOFF_MS = Number(process.env.NEXT_PUBLIC_LP_FAIL_BACKOFF_MS ?? "30000");

export function usePositions(ownerAddress?: Address, isConnected = false) {
  const [clLoading, setClLoading] = useState(false);
  const [clError, setClError] = useState<string | null>(null);
  const [clPositions, setClPositions] = useState<CLPosition[]>([]);
  const lastClFetchAtRef = useRef<number>(0);
  const nextAllowedCLAtRef = useRef<number>(0);
  const lastSearchedAddressRef = useRef<string | null>(null);
  const autoRefreshInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchPositions = useCallback(async (silent = false, force = false) => {
    if (!ownerAddress || !isAddress(ownerAddress)) {
      setClPositions([]);
      setClLoading(false);
      setClError(null);
      return;
    }

    const addressKey = ownerAddress.toLowerCase();
    
    // Skip if already searched this address (unless forced)
    if (!force && lastSearchedAddressRef.current === addressKey) {
      return;
    }

    const now = Date.now();
    if (!force && now - lastClFetchAtRef.current < AUTO_FETCH_COOLDOWN_MS) return;
    if (now < nextAllowedCLAtRef.current) return;

    lastClFetchAtRef.current = now;
    lastSearchedAddressRef.current = addressKey;
    
    try {
      if (!silent) {
        setClLoading(true);
      }
      setClError(null);
      
      const apiUrl = `/api/cl-positions?owner=${ownerAddress}&debug=true`;
      console.log('[usePositions] Fetching positions:', { apiUrl, ownerAddress, silent, force });
      
      const res = await fetch(apiUrl);
      console.log('[usePositions] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        let errorText = '';
        try {
          errorText = await res.text();
        } catch (e) {
          errorText = `Failed to read error response: ${e}`;
        }
        
        console.error('[usePositions] Fetch failed:', {
          status: res.status,
          statusText: res.statusText,
          error: errorText,
          url: apiUrl,
          ownerAddress
        });
        
        let errorMessage = `CL fetch failed (${res.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.debug) {
            console.error('[usePositions] Debug info:', errorData.debug);
          }
        } catch {
          // Use text as error message if not JSON
          if (errorText) {
            errorMessage = errorText.substring(0, 200);
          }
        }
        
        setClError(errorMessage);
        setClLoading(false);
        nextAllowedCLAtRef.current = Date.now() + FAIL_BACKOFF_MS;
        return;
      }
      
      const data = await res.json();
      const positionsCount = data?.positions?.length || 0;
      
      // Debug: Log full response size
      const responseText = JSON.stringify(data);
      console.log('[usePositions] API response size:', responseText.length, 'chars');
      console.log('[usePositions] Raw API response (first 1000 chars):', responseText.substring(0, 1000));
      
      console.log('[usePositions] Positions received:', {
        count: positionsCount,
        positions: data?.positions?.slice(0, 3), // Log first 3 for debugging
        debug: data?.debug,
      });
      
      // Debug: Check for staked positions
      const stakedCount = data?.positions?.filter((p: any) => p.isStaked).length || 0;
      console.log('[usePositions] Staked positions in API response:', stakedCount);
      if (stakedCount > 0) {
        console.log('[usePositions] Staked positions:', data?.positions?.filter((p: any) => p.isStaked).map((p: any) => ({
          tokenId: p.tokenId,
          liquidity: p.liquidity,
          isActive: p.isActive,
          pairSymbol: p.pairSymbol
        })));
      }
      
      if (data?.debug) {
        console.log('[usePositions] API debug steps:', data.debug.steps);
      }
      
      console.log(`[usePositions] ✅ Setting ${positionsCount} positions to state`);
      console.log('[usePositions] Full positions array length:', data?.positions?.length);
      setClPositions(data?.positions || []);
      console.log('[usePositions] ✅ State updated, clPositions.length:', data?.positions?.length || 0);
    } catch (e) {
      setClError(e instanceof Error ? e.message : String(e));
      nextAllowedCLAtRef.current = Date.now() + FAIL_BACKOFF_MS;
    } finally {
      setClLoading(false);
    }
  }, [ownerAddress]);

  // Auto discover CL positions when connected or address changes
  useEffect(() => {
    console.log('[usePositions] Effect triggered:', { ownerAddress, isConnected });
    
    if (!ownerAddress) {
      console.log('[usePositions] No ownerAddress, clearing state');
      setClPositions([]);
      setClLoading(false);
      setClError(null);
      lastSearchedAddressRef.current = null;
      return;
    }
    
    // Always fetch when ownerAddress changes
    console.log('[usePositions] Fetching positions for ownerAddress:', ownerAddress);
    fetchPositions(false, true);
  }, [ownerAddress, fetchPositions]);
  
  // Clear positions when wallet disconnects (but not when viewing an address)
  useEffect(() => {
    // Only clear if wallet disconnected AND we don't have an ownerAddress to view
    // If we have ownerAddress, we're viewing someone else's positions, so keep them
    if (!isConnected && !ownerAddress) {
      console.log('[usePositions] Wallet disconnected and no address to view, clearing positions');
      setClPositions([]);
      setClLoading(false);
      setClError(null);
      lastSearchedAddressRef.current = null;
      lastClFetchAtRef.current = 0;
    }
  }, [isConnected, ownerAddress]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    // Refresh if we have ownerAddress (either connected or viewing)
    if (!ownerAddress) {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
      return;
    }

    autoRefreshInterval.current = setInterval(() => {
      fetchPositions(true); // Silent refresh
    }, 30000); // 30 seconds

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
  }, [ownerAddress, fetchPositions]);

  return {
    clPositions,
    clLoading,
    clError,
    refresh: () => fetchPositions(false, true),
  };
}

