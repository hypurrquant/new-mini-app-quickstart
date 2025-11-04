"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * Hook for handling navigation in Base Mini Apps
 * Uses sdk.actions.openUrl() when in Base App context, otherwise uses Next.js router
 * 
 * @example
 * const navigate = useMiniAppNavigation();
 * navigate("/lp");
 */
export function useMiniAppNavigation() {
  const router = useRouter();

  const navigate = useCallback(async (path: string) => {
    // Check if we're in a Base Mini App context
    const isMiniAppContext = typeof window !== "undefined" && 
      (window.location.href.includes("farcaster.xyz") || 
       window.location.href.includes("base.org") ||
       window.parent !== window);

    if (isMiniAppContext) {
      try {
        // Get the full URL
        const baseUrl = 
          process.env.NEXT_PUBLIC_ROOT_URL ||
          process.env.NEXT_PUBLIC_URL ||
          window.location.origin;
        const fullUrl = `${baseUrl}${path}`;
        
        // Use SDK's openUrl for navigation in Base App
        await sdk.actions.openUrl({ url: fullUrl });
      } catch (error) {
        console.warn("[MiniApp] openUrl failed, falling back to router:", error);
        // Fallback to Next.js router
        router.push(path);
      }
    } else {
      // Regular browser, use Next.js router
      router.push(path);
    }
  }, [router]);

  return navigate;
}

