"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * MiniApp Initializer Component
 * Calls sdk.actions.ready() to hide the loading splash screen and display the app
 * Required for Base Mini Apps migration
 * @see https://docs.base.org/mini-apps/quickstart/migrate-existing-apps
 */
export function MiniAppInitializer() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Always try to call ready() - SDK will handle if not in mini app context
    const callReady = async () => {
      let attempts = 0;
      const maxAttempts = 5;
      
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
          // Don't pass disableNativeGestures to allow Base App's native scrolling
          // Base App handles scrolling natively when this option is not set
          await sdk.actions.ready();
          setIsReady(true);
          console.log(`[MiniApp] ✅ SDK ready() called successfully (native scrolling enabled)`);
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
  }, []);

  return null;
}

