export const DEFAULT_CLIENT_PREFERENCES = {
  themeMode: "dark",
  themeColor: "Cyan",
  messageSounds: true,
  callRingtone: true,
};

const STORAGE_KEY = "egchat-preferences";

const THEME_COLORS = {
  Emerald: {
    accent: "16 185 129",
    accentSoft: "16 185 129",
    accentText: "110 231 183",
  },
  Blue: {
    accent: "59 130 246",
    accentSoft: "37 99 235",
    accentText: "147 197 253",
  },
  Purple: {
    accent: "139 92 246",
    accentSoft: "124 58 237",
    accentText: "196 181 253",
  },
  Rose: {
    accent: "244 63 94",
    accentSoft: "225 29 72",
    accentText: "251 113 133",
  },
  Amber: {
    accent: "245 158 11",
    accentSoft: "217 119 6",
    accentText: "252 211 77",
  },
  Cyan: {
    accent: "34 211 238",
    accentSoft: "6 182 212",
    accentText: "103 232 249",
  },
};

function canUseBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readStoredPreferences() {
  if (!canUseBrowser()) return {};

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function getClientPreferences(user = null) {
  const stored = readStoredPreferences();

  return {
    ...DEFAULT_CLIENT_PREFERENCES,
    ...stored,
    themeMode: stored.themeMode || user?.themeMode || DEFAULT_CLIENT_PREFERENCES.themeMode,
    themeColor:
      stored.themeColor || user?.themeColor || DEFAULT_CLIENT_PREFERENCES.themeColor,
    messageSounds:
      typeof stored.messageSounds === "boolean"
        ? stored.messageSounds
        : typeof user?.messageSounds === "boolean"
        ? user.messageSounds
        : DEFAULT_CLIENT_PREFERENCES.messageSounds,
    callRingtone:
      typeof stored.callRingtone === "boolean"
        ? stored.callRingtone
        : typeof user?.callRingtone === "boolean"
        ? user.callRingtone
        : DEFAULT_CLIENT_PREFERENCES.callRingtone,
  };
}

export function saveClientPreferences(nextPreferences = {}) {
  if (!canUseBrowser()) return getClientPreferences();

  const preferences = {
    ...getClientPreferences(),
    ...nextPreferences,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  applyThemePreferences(preferences);
  window.dispatchEvent(
    new CustomEvent("egchat-preferences", { detail: preferences })
  );

  return preferences;
}

export function applyThemePreferences(preferences = getClientPreferences()) {
  if (!canUseBrowser()) return;

  const root = document.documentElement;
  const color = THEME_COLORS[preferences.themeColor] || THEME_COLORS.Cyan;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const useDark =
    preferences.themeMode === "dark" ||
    (preferences.themeMode === "system" && prefersDark);

  root.classList.toggle("dark", useDark);
  root.classList.toggle("theme-dark", useDark);
  root.classList.toggle("theme-light", !useDark);
  root.dataset.themeMode = useDark ? "dark" : "light";
  root.dataset.themeColor = preferences.themeColor || "Cyan";
  root.style.setProperty("--app-accent", color.accent);
  root.style.setProperty("--app-accent-soft", color.accentSoft);
  root.style.setProperty("--app-accent-text", color.accentText);
}

export function playNotificationSound(kind = "message") {
  if (!canUseBrowser()) return;

  const preferences = getClientPreferences();

  if (kind === "message" && !preferences.messageSounds) return;
  if (kind === "call" && !preferences.callRingtone) return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  try {
    const context = new AudioContext();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "call" ? 0.08 : 0.045, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "call" ? 0.75 : 0.42));

    const tones = kind === "call" ? [392, 523.25, 392] : [659.25, 880];
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.14);
      oscillator.connect(gain);
      oscillator.start(now + index * 0.14);
      oscillator.stop(now + index * 0.14 + 0.18);
    });

    window.setTimeout(() => context.close(), kind === "call" ? 900 : 550);
  } catch {
    // Browsers can block audio until the first user interaction.
  }
}
