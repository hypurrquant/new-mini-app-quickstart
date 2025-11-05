"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * MiniApp Initializer Component
 * Calls sdk.actions.ready() to hide the loading splash screen and display the app
 * Required for Base Mini Apps migration
 * @see https://docs.base.org/mini-apps/quickstart/migrate-existing-apps
 */
export function MiniAppInitializer() {
  const [isReady, setIsReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Always try to call ready() - SDK will handle if not in mini app context
    const callReady = async () => {
      let attempts = 0;
      const maxAttempts = 5;
      
      // Determine if we need to disable native gestures
      // Only disable for pages that use custom gestures (like pull-to-refresh)
      // Landing page and other pages should allow native scrolling
      const needsDisableGestures = pathname === '/lp'; // Only /lp page has pull-to-refresh
      
      while (attempts < maxAttempts) {
        try {
          attempts++;
          
          // Wait for SDK to initialize (increase wait time with each attempt)
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          
          // Check if SDK is available
          if (typeof sdk === "undefined" || !sdk.actions) {
            console.warn(`[MiniApp] SDK not available (attempt ${attempts}/${maxAttempts})`);
            if (attempts < maxAttempts) continue;
            return;
          }
          
          // Call ready() to hide the loading splash screen
          // disableNativeGestures: true is only needed for pages with custom gestures
          // (like pull-to-refresh). For normal scrolling pages, set to false to allow
          // Base App's native scrolling to work properly.
          await sdk.actions.ready({ disableNativeGestures: needsDisableGestures });
          setIsReady(true);
          console.log(`[MiniApp] ✅ SDK ready() called successfully (disableNativeGestures: ${needsDisableGestures})`);
          return;
        } catch (error: any) {
          // Check if error is because we're not in mini app context
          const errorMessage = error?.message || String(error);
          const isNotInContext = errorMessage.includes("not in mini app") || 
                                 errorMessage.includes("not available") ||
                                 errorMessage.includes("not supported");
          
          if (isNotInContext) {
            // Not in mini app context, this is expected
            console.log("[MiniApp] Not in mini app context, skipping ready()");
            return;
          }
          
          // Other error, log and retry
          console.warn(`[MiniApp] SDK ready() failed (attempt ${attempts}/${maxAttempts}):`, error);
          
          if (attempts >= maxAttempts) {
            console.error("[MiniApp] ❌ Failed to call ready() after all attempts");
            // Still mark as ready to allow app to continue
            setIsReady(true);
            return;
          }
        }
      }
    };

    callReady();
  }, [pathname]);

  return null;
}

