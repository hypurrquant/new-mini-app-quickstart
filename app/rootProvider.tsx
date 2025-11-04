"use client";
import { ReactNode } from "react";
import { base } from "wagmi/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import "@coinbase/onchainkit/styles.css";

// Force English locale to avoid "ko not supported yet" error from Coinbase SDK
// Override navigator properties immediately when module loads
if (typeof window !== "undefined") {
  const originalLanguage = navigator.language;
  const originalLanguages = navigator.languages;
  
  // Override navigator.language to English for Coinbase SDK compatibility
  try {
    Object.defineProperty(navigator, "language", {
      get: () => originalLanguage?.startsWith("ko") ? "en-US" : originalLanguage,
      configurable: true,
      enumerable: true,
    });
    
    Object.defineProperty(navigator, "languages", {
      get: () => originalLanguage?.startsWith("ko") ? ["en-US", "en"] : originalLanguages,
      configurable: true,
      enumerable: true,
    });
  } catch (e) {
    // Fallback: try direct assignment (won't work but we tried)
    console.warn("Could not override navigator.language:", e);
  }
  
  // Suppress console errors from Coinbase SDK about unsupported locales
  const originalError = console.error;
  console.error = function(...args: any[]) {
    const message = args[0]?.toString() || "";
    if (message.includes("not supported yet") || message.includes("ko not supported")) {
      // Suppress this specific error
      return;
    }
    originalError.apply(console, args);
  };

  // Suppress CSP logging 403 errors from Coinbase SDK
  // These are harmless logging attempts that fail due to CSP policies
  const originalFetch = window.fetch;
  window.fetch = function(...args: any[]) {
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
    // Suppress CSP logging requests to keys.coinbase.com
    if (url.includes("keys.coinbase.com") && url.includes("csp-logging")) {
      // Return a rejected promise that won't log errors
      return Promise.reject(new Error("CSP logging suppressed")).catch(() => {
        // Silently catch to prevent unhandled promise rejection
        return new Response(null, { status: 403 });
      });
    }
    return originalFetch.apply(window, args as [RequestInfo | URL, RequestInit?]);
  };
}

export function RootProvider({ children }: { children: ReactNode }) {
  const appName = process.env.NEXT_PUBLIC_PROJECT_NAME || "LPing";
  // Get the root URL from environment or construct it
  const rootUrl = 
    process.env.NEXT_PUBLIC_ROOT_URL || 
    process.env.NEXT_PUBLIC_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const appLogo = `${rootUrl}/blue-icon.png`;

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          name: appName,
          logo: appLogo,
          mode: "auto",
        },
        wallet: {
          display: "modal",
          // Smart Wallet is automatically enabled with OnchainKit
          // preference: "all" includes Smart Wallet as first option for new users
          preference: "all", // includes Smart Wallet, Coinbase Wallet, MetaMask, Rabby, etc.
          supportedWallets: {
            rabby: true, // Enable Rabby wallet
            trust: false,
            frame: false,
          },
          // Smart Wallet configuration
          // OnchainKit automatically uses Coinbase Smart Wallet (ERC-4337)
          // Factory address: 0xBA5ED110eFDBa3D005bfC882d75358ACBbB85842 (v1.1)
          // Supports passkey signers and Ethereum address owners
        },
      }}
      miniKit={{
        enabled: true,
        autoConnect: true,
        notificationProxyUrl: undefined,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}