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
    "https://lping.vercel.app";

  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    viewport: {
      width: "device-width",
      initialScale: 1,
      maximumScale: 5,
      userScalable: true,
      viewportFit: "cover", // Important for Base App mini apps
    },
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Enjoy the ${minikitConfig.miniapp.name}`,
          action: {
            name: minikitConfig.miniapp.name,
            type: "launch_frame",
            url: ROOT_URL,
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
        imageUrl: minikitConfig.miniapp.iconUrl,
        button: {
          title: "Launch LPing",
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
        {/* Critical error suppression - must run FIRST before any other scripts */}
        <Script
          id="wallet-error-suppression"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                'use strict';
                
                // Suppress MetaMask/wallet extension conflicts - must run first
                try {
                  // Protect window.ethereum from redefinition errors
                  var ethereumDescriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
                  if (ethereumDescriptor && !ethereumDescriptor.configurable) {
                    // Make it configurable if possible
                    try {
                      Object.defineProperty(window, 'ethereum', {
                        ...ethereumDescriptor,
                        configurable: true,
                        writable: true
                      });
                    } catch(e) {
                      // Ignore if we can't make it configurable
                    }
                  }
                } catch(e) {
                  // Ignore
                }
                
                // Wrap Object.defineProperty to catch ethereum redefinition errors
                var originalDefineProperty = Object.defineProperty;
                Object.defineProperty = function(obj, prop, descriptor) {
                  if (prop === 'ethereum' && obj === window) {
                    try {
                      return originalDefineProperty.call(this, obj, prop, descriptor);
                    } catch(e) {
                      // Silently ignore redefinition errors - expected when multiple wallets installed
                      if (e.message && (e.message.includes('Cannot redefine property') || 
                          e.message.includes('Cannot set property'))) {
                        return obj;
                      }
                      throw e;
                    }
                  }
                  return originalDefineProperty.call(this, obj, prop, descriptor);
                };
                
                // Global error handler for wallet extension conflicts
                window.addEventListener('error', function(event) {
                  var message = event.message || '';
                  if (message.includes('Cannot redefine property: ethereum') ||
                      message.includes('Cannot set property ethereum') ||
                      message.includes('MetaMask encountered an error')) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return false;
                  }
                }, true);
                
                // Handle unhandled promise rejections
                window.addEventListener('unhandledrejection', function(event) {
                  var reason = event.reason;
                  var message = reason && reason.toString ? reason.toString() : '';
                  if (message.includes('Cannot redefine property: ethereum') ||
                      message.includes('Cannot set property ethereum') ||
                      message.includes('MetaMask encountered an error')) {
                    event.preventDefault();
                    return false;
                  }
                });
              })();
            `,
          }}
        />
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
                    // Suppress Analytics SDK fetch errors
                    if (url.includes('cca-lite.coinbase.com') || url.includes('/metrics')) {
                      return Promise.reject(new Error('Analytics request suppressed')).catch(function() {
                        return new Response(null, { status: 200 });
                      });
                    }
                    return originalFetch.apply(window, arguments);
                  };
                  
                  // Suppress MetaMask/wallet extension conflicts (additional layer)
                  try {
                    var originalDefineProperty = Object.defineProperty;
                    Object.defineProperty = function(obj, prop, descriptor) {
                      // Suppress ethereum property redefinition errors
                      if (prop === 'ethereum' && obj === window) {
                        try {
                          return originalDefineProperty.call(this, obj, prop, descriptor);
                        } catch(e) {
                          if (e.message && e.message.includes('Cannot redefine property')) {
                            // Silently ignore - this is expected when multiple wallets are installed
                            return obj;
                          }
                          throw e;
                        }
                      }
                      return originalDefineProperty.call(this, obj, prop, descriptor);
                    };
                  } catch(e) {
                    // Ignore if we can't override defineProperty
                  }
                  
                  // Suppress MetaMask provider errors
                  window.addEventListener('error', function(event) {
                    var message = event.message || '';
                    if (message.includes('Cannot redefine property: ethereum') ||
                        message.includes('Cannot set property ethereum') ||
                        message.includes('MetaMask encountered an error setting')) {
                      event.preventDefault();
                      event.stopPropagation();
                      return false;
                    }
                  }, true);
                  
                  // Suppress unhandled promise rejections from wallet extensions
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    var message = reason && reason.toString ? reason.toString() : '';
                    if (message.includes('Cannot redefine property: ethereum') ||
                        message.includes('Cannot set property ethereum') ||
                        message.includes('MetaMask encountered an error')) {
                      event.preventDefault();
                      return false;
                    }
                  });
                }
              })();
            `,
          }}
        />
        <body className={`${inter.variable} ${sourceCodePro.variable}`}>
          <MiniAppInitializer />
          <LocaleFix />
          <Script
            id="scroll-enable"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                // Force enable scrolling in Base App mini app
                (function() {
                  function enableScrolling() {
                    var body = document.body;
                    var html = document.documentElement;
                    
                    if (body) {
                      body.style.height = '100%';
                      body.style.overflowY = 'auto';
                      body.style.webkitOverflowScrolling = 'touch';
                      body.style.position = 'relative';
                    }
                    
                    if (html) {
                      html.style.height = '100%';
                      html.style.overflow = 'hidden';
                    }
                    
                    // Ensure content is scrollable
                    var content = document.getElementById('__next') || document.querySelector('[data-nextjs-scroll-focus-boundary]');
                    if (content) {
                      content.style.minHeight = '100%';
                      content.style.height = 'auto';
                    }
                  }
                  
                  // Run immediately
                  enableScrolling();
                  
                  // Run after DOM is ready
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', enableScrolling);
                  } else {
                    enableScrolling();
                  }
                  
                  // Run after a delay to catch any dynamic changes
                  setTimeout(enableScrolling, 100);
                  setTimeout(enableScrolling, 500);
                })();
              `,
            }}
          />
          <SafeArea>{children}</SafeArea>
        </body>
      </html>
    </RootProvider>
  );
}
