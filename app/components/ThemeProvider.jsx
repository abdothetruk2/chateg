"use client";

import { useEffect } from "react";
import Cookies from "js-cookie";
import {
  applyThemePreferences,
  getClientPreferences,
} from "../../lib/clientPreferences";

function getCookieUser() {
  try {
    const rawUser = Cookies.get("user");
    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    return Array.isArray(parsedUser) ? parsedUser[0] : parsedUser;
  } catch {
    return null;
  }
}

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const applyCurrentTheme = () => {
      applyThemePreferences(getClientPreferences(getCookieUser()));
    };

    applyCurrentTheme();

    window.addEventListener("storage", applyCurrentTheme);
    window.addEventListener("egchat-preferences", applyCurrentTheme);

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    mediaQuery?.addEventListener?.("change", applyCurrentTheme);

    return () => {
      window.removeEventListener("storage", applyCurrentTheme);
      window.removeEventListener("egchat-preferences", applyCurrentTheme);
      mediaQuery?.removeEventListener?.("change", applyCurrentTheme);
    };
  }, []);

  return children;
}
