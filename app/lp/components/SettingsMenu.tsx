import Link from "next/link";
import type { Theme } from "../types";

interface SettingsMenuProps {
  theme: Theme;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  showMenu: boolean;
  onToggleMenu: () => void;
  onShowRewards: () => void;
}

export default function SettingsMenu({ 
  theme, 
  darkMode, 
  setDarkMode, 
  showMenu, 
  onToggleMenu,
  onShowRewards 
}: SettingsMenuProps) {
  return (
    <>
      <button
        onClick={onToggleMenu}
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${theme.border}`,
          background: theme.bgCard,
          color: theme.text,
          cursor: "pointer",
          fontSize: 20,
          fontWeight: 600,
          lineHeight: 1,
        }}
        title="Settings"
        aria-label="Settings menu"
      >
        ⋮
      </button>
      
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          background: theme.bgCard,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          minWidth: 180,
          zIndex: 100,
        }}>
          {/* Dark Mode Toggle */}
          <button
            onClick={() => {
              setDarkMode(!darkMode);
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${theme.border}`,
              color: theme.text,
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <span>{darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          </button>
          
          {/* Rewards */}
          <button
            onClick={() => {
              onShowRewards();
              onToggleMenu();
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${theme.border}`,
              color: theme.text,
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            🎁 Rewards
          </button>
          
          {/* Docs */}
          <a
            href="https://docs.base.org" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${theme.border}`,
              color: theme.text,
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            📚 Docs
          </a>
          
          {/* Home Link */}
          <Link 
            href="/" 
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: theme.text,
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              borderRadius: '0 0 12px 12px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.bgSecondary}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            🏠 Home
          </Link>
        </div>
      )}
    </>
  );
}

