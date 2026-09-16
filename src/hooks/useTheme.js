import { useCallback, useEffect, useState } from "react";
import { THEME_KEY } from "../theme";

// Night is the default: a journal gets opened last thing at night more often
// than it gets read in direct sun. The choice is remembered per device.
function read() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "night" || stored === "day") return stored;
  } catch {
    // Storage can be unavailable; the default still works.
  }
  // Night is the brand, not a fallback: the app opens dark whatever the OS
  // says, and the header toggle switches it for good.
  return "night";
}

export function useTheme() {
  const [theme, setTheme] = useState(read);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    // Keep the installed app's status bar in step with the page.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "day" ? "#F6F4EE" : "#0B0B0F");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Not being able to remember it is not a reason to fail.
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "night" ? "day" : "night")), []);

  return { theme, setTheme, toggle };
}
