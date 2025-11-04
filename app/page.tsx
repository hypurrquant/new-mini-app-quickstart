"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AttendanceCheck from "./components/AttendanceCheck";

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
      overflow: 'hidden',
      position: 'relative',
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
          background: theme.gradient,
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

      {/* 출석 체크 컴포넌트 */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        padding: '16px 24px',
        background: darkMode ? 'rgba(10, 10, 10, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <AttendanceCheck darkMode={darkMode} theme={theme} />
        </div>
      </div>

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
          marginBottom: 24,
          animation: 'fadeInUp 0.8s ease-out',
        }}>
          <h1 style={{
            fontSize: 'clamp(40px, 8vw, 72px)',
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 16,
            background: theme.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Track Your LP Positions
            <br />
            Like a Pro
          </h1>
          <p style={{
            fontSize: 'clamp(18px, 3vw, 24px)',
            color: theme.textSecondary,
            maxWidth: 700,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Real-time monitoring of your Aerodrome Concentrated Liquidity positions. 
            Track rewards, analyze performance, and never miss an opportunity.
          </p>
        </div>

        {/* CTA Button */}
        <div style={{
          marginTop: 48,
          animation: 'fadeInUp 1s ease-out',
        }}>
          <Link 
            href="/lp"
            style={{
              display: 'inline-block',
              padding: '18px 48px',
              fontSize: 20,
              fontWeight: 700,
              color: '#ffffff',
              background: theme.gradient,
              border: 'none',
              borderRadius: 16,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: darkMode 
                ? '0 8px 32px rgba(66, 165, 245, 0.3)' 
                : '0 8px 32px rgba(37, 99, 235, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = darkMode 
                ? '0 12px 40px rgba(66, 165, 245, 0.4)' 
                : '0 12px 40px rgba(37, 99, 235, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = darkMode 
                ? '0 8px 32px rgba(66, 165, 245, 0.3)' 
                : '0 8px 32px rgba(37, 99, 235, 0.3)';
            }}
          >
            🚀 Launch App
          </Link>
        </div>

        {/* Feature Cards */}
        <div style={{
          marginTop: 100,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          animation: 'fadeInUp 1.2s ease-out',
        }}>
          {[
            {
              icon: '📊',
              title: 'Real-Time Tracking',
              description: 'Monitor your positions with live data updates every 60 seconds',
            },
            {
              icon: '💰',
              title: 'Rewards Analytics',
              description: 'Track claimable rewards and estimated daily/weekly/monthly earnings',
            },
            {
              icon: '📈',
              title: 'Performance Insights',
              description: 'View APR, ROI, and detailed position history at a glance',
            },
            {
              icon: '🎯',
              title: 'Price Range Monitor',
              description: 'Stay informed about your CL position price ranges and current prices',
            },
            {
              icon: '🔄',
              title: 'Auto-Refresh',
              description: 'Set it and forget it - automatic updates keep you informed',
            },
            {
              icon: '🌙',
              title: 'Beautiful UI',
              description: 'Sleek design with dark mode support for comfortable viewing',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              style={{
                padding: 32,
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animationDelay: `${idx * 0.1}s`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.borderColor = theme.accent;
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 12px 32px rgba(66, 165, 245, 0.2)'
                  : '0 12px 32px rgba(37, 99, 235, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>{feature.icon}</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 14, color: theme.textSecondary, lineHeight: 1.6 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div style={{
          marginTop: 100,
          padding: 48,
          background: theme.cardBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 24,
          animation: 'fadeInUp 1.4s ease-out',
        }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 48,
            background: theme.gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Why LPing?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 32,
          }}>
            {[
              { value: 'Free', label: 'Forever' },
              { value: '100%', label: 'Open Source' },
              { value: '<1s', label: 'Load Time' },
              { value: '24/7', label: 'Monitoring' },
            ].map((stat, idx) => (
              <div key={idx}>
                <div style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: theme.accent,
                  marginBottom: 8,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: 16,
                  color: theme.textSecondary,
                  fontWeight: 600,
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          marginTop: 100,
          padding: 64,
          background: theme.gradient,
          borderRadius: 24,
          animation: 'fadeInUp 1.6s ease-out',
        }}>
          <h2 style={{
            fontSize: 40,
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: 16,
          }}>
            Ready to optimize your LP?
          </h2>
          <p style={{
            fontSize: 18,
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: 32,
            maxWidth: 600,
            margin: '0 auto 32px',
          }}>
            Join hundreds of LPs who are already tracking their positions with LPing
          </p>
          <Link 
            href="/lp"
            style={{
              display: 'inline-block',
              padding: '18px 48px',
              fontSize: 20,
              fontWeight: 700,
              color: theme.text,
              background: darkMode ? '#ffffff' : '#ffffff',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
            }}
          >
            Get Started Now →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        padding: '32px 24px',
        textAlign: 'center',
        borderTop: `1px solid ${theme.border}`,
        color: theme.textSecondary,
        fontSize: 14,
      }}>
        <p>Built with ❤️ for the Aerodrome community</p>
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
