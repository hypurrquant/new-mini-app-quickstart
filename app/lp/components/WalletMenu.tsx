import { useState } from "react";
import { useDisconnect } from "wagmi";
import type { Theme } from "../types";

interface WalletMenuProps {
  address: string;
  theme: Theme;
  showMenu: boolean;
  onToggleMenu: () => void;
  isViewing?: boolean;
}

export default function WalletMenu({ address, theme, showMenu, onToggleMenu, isViewing }: WalletMenuProps) {
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleDisconnect = () => {
    if (isViewing) {
      // If viewing someone else's address, just navigate back to /lp
      window.location.href = '/lp';
    } else {
      disconnect();
    }
    onToggleMenu();
  };

  return (
    <>
      <button
        onClick={onToggleMenu}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: `2px solid ${theme.success}`,
          background: theme.bgCard,
          color: theme.text,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
        aria-label="Wallet menu"
      >
        🟢 {address.slice(0, 6)}...{address.slice(-4)}
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
          minWidth: 240,
          zIndex: 100,
        }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 4 }}>
                {isViewing ? 'Viewing Address' : 'Connected Wallet'}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            </div>
            <button
              onClick={handleCopy}
              style={{
                padding: '6px 8px',
                background: theme.bgSecondary,
                border: `1px solid ${theme.border}`,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 16,
              }}
              title="Copy full address"
              aria-label="Copy address"
            >
              📋
            </button>
          </div>
          
          <button
            onClick={handleDisconnect}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: theme.warning,
              cursor: 'pointer',
              fontSize: 14,
              textAlign: 'left',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = theme.warningBg}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {isViewing ? '🔙 Back to My Positions' : '🚪 Disconnect'}
          </button>
        </div>
      )}
      {copied && (
        <div style={{ 
          position: 'fixed', 
          right: 16, 
          bottom: 16, 
          background: theme.bg, 
          color: theme.text, 
          padding: '8px 12px', 
          borderRadius: 8, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: 1000,
        }}>
          Copied!
        </div>
      )}
    </>
  );
}

