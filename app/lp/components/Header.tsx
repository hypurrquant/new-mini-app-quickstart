import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import type { Theme } from "../types";
import WalletMenu from "./WalletMenu";
import SettingsMenu from "./SettingsMenu";

interface HeaderProps {
  theme: Theme;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  onShowGuide: () => void;
  onShowRewards: () => void;
}

export default function Header({ theme, darkMode, setDarkMode, onShowGuide, onShowRewards }: HeaderProps) {
  const { address: connectedAddress } = useAccount();
  const walletMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) {
        setShowWalletMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <div style={{ 
          fontSize: 24, 
          fontWeight: 800, 
          backgroundImage: darkMode 
            ? 'linear-gradient(135deg, #42a5f5 0%, #81c784 100%)'
            : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          LPing
        </div>
      </Link>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {/* Guide Button */}
        <button
          onClick={onShowGuide}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bgCard,
            color: theme.text,
            cursor: "pointer",
            fontSize: 16,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
          }}
          title="Guide"
          aria-label="Show guide"
        >
          ?
        </button>
        
        {/* Wallet Button with Dropdown */}
        <div style={{ position: 'relative' }} ref={walletMenuRef}>
          {connectedAddress ? (
            <WalletMenu
              address={connectedAddress}
              theme={theme}
              showMenu={showWalletMenu}
              onToggleMenu={() => setShowWalletMenu(!showWalletMenu)}
            />
          ) : (
            <ConnectWallet />
          )}
        </div>
        
        {/* Settings Menu Button */}
        <div style={{ position: 'relative' }} ref={settingsMenuRef}>
          <SettingsMenu
            theme={theme}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            showMenu={showSettingsMenu}
            onToggleMenu={() => setShowSettingsMenu(!showSettingsMenu)}
            onShowRewards={onShowRewards}
          />
        </div>
      </div>
    </div>
  );
}

