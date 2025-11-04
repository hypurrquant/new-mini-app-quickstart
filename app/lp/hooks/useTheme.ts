import { useState, useEffect, useMemo } from "react";
import type { Theme } from "../types";

export function useTheme() {
  const [darkMode, setDarkMode] = useState(false);

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

  const theme: Theme = useMemo(() => ({
    bg: darkMode ? '#1a1a1a' : '#ffffff',
    bgSecondary: darkMode ? '#2a2a2a' : '#fafafa',
    bgCard: darkMode ? '#2d2d2d' : '#ffffff',
    border: darkMode ? '#444' : '#eee',
    text: darkMode ? '#e0e0e0' : '#000000',
    textSecondary: darkMode ? '#a0a0a0' : '#666',
    success: darkMode ? '#4caf50' : '#2e7d32',
    successBg: darkMode ? '#1b5e20' : '#e8f5e9',
    successBorder: darkMode ? '#2e7d32' : '#c8e6c9',
    warning: darkMode ? '#ff9800' : '#c62828',
    warningBg: darkMode ? '#e65100' : '#ffebee',
    primary: darkMode ? '#42a5f5' : '#1976d2',
    skeleton: darkMode ? '#3a3a3a' : '#f3f3f3',
    infoBg: darkMode ? '#424242' : '#fff8e1',
    infoBorder: darkMode ? '#616161' : '#ffecb5',
  }), [darkMode]);

  return { darkMode, setDarkMode, theme };
}

