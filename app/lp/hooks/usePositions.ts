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
  }, [ownerAddress]);

  // Auto discover CL positions when connected or address changes
  useEffect(() => {
    if (!ownerAddress) {
      setClPositions([]);
      setClLoading(false);
      setClError(null);
      lastSearchedAddressRef.current = null;
      return;
    }
    
    // Always fetch when ownerAddress changes
    fetchPositions(false, true);
  }, [ownerAddress, fetchPositions]);
  
  // Clear positions when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setClPositions([]);
      setClLoading(false);
      setClError(null);
      lastSearchedAddressRef.current = null;
      lastClFetchAtRef.current = 0;
    }
  }, [isConnected]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!ownerAddress || !isConnected) {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
      return;
    }

    autoRefreshInterval.current = setInterval(() => {
      fetchPositions(true); // Silent refresh
    }, 60000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
        autoRefreshInterval.current = null;
      }
    };
  }, [ownerAddress, isConnected, fetchPositions]);

  return {
    clPositions,
    clLoading,
    clError,
    refresh: () => fetchPositions(false, true),
  };
}

