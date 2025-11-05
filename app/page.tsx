"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LPCalculator from "./components/LPCalculator";

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

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

  const theme = {
    bg: darkMode ? '#0a0a0a' : '#ffffff',
    bgSecondary: darkMode ? '#1a1a1a' : '#f8f9fa',
    text: darkMode ? '#ffffff' : '#000000',
    textSecondary: darkMode ? '#a0a0a0' : '#666666',
    accent: darkMode ? '#42a5f5' : '#1976d2',
    accentHover: darkMode ? '#64b5f6' : '#1565c0',
    border: darkMode ? '#2a2a2a' : '#e0e0e0',
    cardBg: darkMode ? '#141414' : '#ffffff',
    gradient: darkMode 
      ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)'
      : 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: theme.bg, 
      color: theme.text,
      transition: 'all 0.3s ease',
      position: 'relative',
      width: '100%',
      overflowY: 'auto', // Ensure vertical scrolling works
      WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
      touchAction: 'pan-y', // Enable touch scrolling - critical for Base App
      overscrollBehavior: 'auto', // Allow native scroll bounce
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.gradient,
        opacity: darkMode ? 0.15 : 0.08,
        zIndex: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '300px',
          height: '300px',
          background: darkMode ? 'rgba(66, 165, 245, 0.2)' : 'rgba(37, 99, 235, 0.2)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: darkMode ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 10s ease-in-out infinite reverse',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.border}`,
        background: darkMode ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          backgroundImage: theme.gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          LPing
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${theme.border}`,
              background: theme.cardBg,
              color: theme.text,
              cursor: 'pointer',
              fontSize: 16,
              transition: 'all 0.2s',
            }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1200,
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        {/* Main Title */}
        <div style={{
          marginBottom: 32,
          animation: 'fadeInUp 0.8s ease-out',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: darkMode ? 'rgba(66, 165, 245, 0.2)' : 'rgba(37, 99, 235, 0.1)',
            border: darkMode ? `1px solid rgba(66, 165, 245, 0.3)` : 'none',
            color: theme.accent,
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 24,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: theme.accent }}></span>
            Discover profitable LP strategies
          </div>
          
          <h1 style={{
            fontSize: 'clamp(48px, 10vw, 96px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 24,
            color: theme.text,
            letterSpacing: '-0.02em',
          }}>
            Share. Mint. Profit.
            <br />
            <span style={{
              backgroundImage: theme.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Up to 50% APY.
            </span>
          </h1>
          <p style={{
            fontSize: 'clamp(20px, 3.5vw, 28px)',
            color: theme.textSecondary,
            maxWidth: 800,
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 400,
          }}>
            Make LP safe and fun. Build returns with LPing.
          </p>
        </div>

        {/* CTA Button */}
        <div style={{
          marginTop: 48,
          animation: 'fadeInUp 1s ease-out',
        }}>
          <button
            onClick={(e) => {
              e.preventDefault();
              // Use router.push directly for internal navigation
              // Base App mini apps handle internal routing through Next.js router
              router.push('/lp');
            }}
            style={{
              display: 'inline-block',
              padding: '20px 56px',
              fontSize: 18,
              fontWeight: 700,
              color: '#ffffff',
              background: theme.gradient,
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: darkMode 
                ? '0 8px 32px rgba(66, 165, 245, 0.4)' 
                : '0 8px 32px rgba(37, 99, 235, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = darkMode 
                ? '0 12px 40px rgba(66, 165, 245, 0.5)' 
                : '0 12px 40px rgba(37, 99, 235, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = darkMode 
                ? '0 8px 32px rgba(66, 165, 245, 0.4)' 
                : '0 8px 32px rgba(37, 99, 235, 0.4)';
            }}
          >
            Launch App
          </button>
        </div>

        {/* Social Proof */}
        <div style={{
          marginTop: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          animation: 'fadeInUp 1.2s ease-out',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: -8,
          }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: theme.gradient,
                  border: `3px solid ${theme.bg}`,
                  marginLeft: i > 1 ? -12 : 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {String.fromCharCode(65 + i - 1)}
              </div>
            ))}
          </div>
          <p style={{
            fontSize: 15,
            color: theme.textSecondary,
            margin: 0,
          }}>
            Join thousands already discovering profitable positions powered by Aerodrome Finance.
          </p>
        </div>

        {/* Feature Cards Section */}
        <div style={{
          padding: '80px 0',
          marginTop: 120,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 32,
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            justifyContent: 'center',
            justifyItems: 'center',
            animation: 'fadeInUp 1.2s ease-out',
          }}>
          {[
            {
              title: 'Not Sure Which Tokens?',
              description: 'Expert-curated pools and optimal ranges for long-term stability.',
              accentColor: darkMode ? '#64b5f6' : theme.accent,
            },
            {
              title: 'See What Others Are Doing',
              description: 'Discover successful strategies from top performers. Follow what works.',
              accentColor: darkMode ? '#ce93d8' : '#9c27b0',
            },
            {
              title: 'Safe Returns, Compounding Growth',
              description: 'Wide-range positions for stability. Earn consistent yield with compounding effects.',
              accentColor: darkMode ? '#81c784' : '#4caf50',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                padding: 40,
                background: theme.cardBg,
                borderRadius: 16,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animationDelay: `${idx * 0.1}s`,
                boxShadow: darkMode
                  ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.05)',
                borderLeft: `4px solid ${feature.accentColor}`,
                position: 'relative',
                width: '100%',
                maxWidth: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 8px 24px rgba(0, 0, 0, 0.6)'
                  : '0 8px 24px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.05)';
              }}
            >
              <h3 style={{ 
                fontSize: 24, 
                fontWeight: 800, 
                marginBottom: 12,
                color: theme.text,
                letterSpacing: '-0.01em',
                lineHeight: 1.3,
              }}>
                {feature.title}
              </h3>
              <p style={{ 
                fontSize: 15, 
                color: theme.textSecondary, 
                lineHeight: 1.6,
                fontWeight: 400,
              }}>
                {feature.description}
              </p>
            </div>
          ))}
          </div>
        </div>

        {/* LP Calculator Section */}
        <LPCalculator darkMode={darkMode} theme={theme} />
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '48px 24px',
        borderTop: `1px solid ${theme.border}`,
        background: darkMode ? '#0a0a0a' : '#ffffff',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            backgroundImage: theme.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            LPing
          </div>
          <div style={{
            fontSize: 14,
            color: theme.textSecondary,
          }}>
            © {new Date().getFullYear()} LPing. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, 20px);
          }
        }
      `}</style>
    </div>
  );
}
