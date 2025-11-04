import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Source_Code_Pro } from "next/font/google";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "../minikit.config";
import { RootProvider } from "./rootProvider";
import { LocaleFix } from "./components/LocaleFix";
import { MiniAppInitializer } from "./components/MiniAppInitializer";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const ROOT_URL =
    process.env.NEXT_PUBLIC_ROOT_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "http://localhost:3000";

  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Join the ${minikitConfig.miniapp.name} Waitlist`,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
      // MiniApp embed metadata for Base App
      // Required for rich embeds when app is shared
      // @see https://docs.base.org/mini-apps/core-concepts/embeds-and-previews
      // MiniApp embed metadata - splashImageUrl and splashBackgroundColor 
      // will default to manifest values if not specified (per Base docs)
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: "Open LPing",
          action: {
            type: "launch_frame",
            url: ROOT_URL,
            name: minikitConfig.miniapp.name,
          },
        },
      }),
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RootProvider>
      <html lang="en">
        <Script
          id="locale-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Force English locale before Coinbase SDK loads to avoid "ko not supported yet" error
              (function() {
                if (typeof navigator !== 'undefined') {
                  var originalLanguage = navigator.language;
                  var originalLanguages = navigator.languages;
                  
                  // Override navigator.language immediately
                  try {
                    Object.defineProperty(navigator, 'language', {
                      get: function() { 
                        return originalLanguage && originalLanguage.startsWith('ko') ? 'en-US' : originalLanguage; 
                      },
                      configurable: true,
                      enumerable: true
                    });
                    Object.defineProperty(navigator, 'languages', {
                      get: function() { 
                        return originalLanguage && originalLanguage.startsWith('ko') ? ['en-US', 'en'] : originalLanguages; 
                      },
                      configurable: true,
                      enumerable: true
                    });
                  } catch(e) {
                    console.warn('Failed to override navigator.language:', e);
                  }
                  
                  // Suppress console errors about unsupported locales
                  var originalError = console.error;
                  console.error = function() {
                    var message = arguments[0] ? arguments[0].toString() : '';
                    if (message.includes('not supported yet') || message.includes('ko not supported')) {
                      return; // Suppress this error
                    }
                    originalError.apply(console, arguments);
                  };
                  
                  // Suppress CSP logging 403 errors from Coinbase SDK
                  var originalFetch = window.fetch;
                  window.fetch = function() {
                    var url = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url) || '';
                    // Suppress CSP logging requests to keys.coinbase.com
                    if (url.includes('keys.coinbase.com') && url.includes('csp-logging')) {
                      // Return a rejected promise that won't log errors
                      return Promise.reject(new Error('CSP logging suppressed')).catch(function() {
                        // Silently catch to prevent unhandled promise rejection
                        return new Response(null, { status: 403 });
                      });
                    }
                    return originalFetch.apply(window, arguments);
                  };
                }
              })();
            `,
          }}
        />
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <MiniAppInitializer />
          <LocaleFix />
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </RootProvider>
  );
}
