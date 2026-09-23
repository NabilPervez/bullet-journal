import { useEffect, useState } from "react";
import { toISODate } from "../lib/dates";

function msUntilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next - now + 50;
}

// Today's ISO date, kept current. An installed app stays open for days, and
// every view that worked "today" out once at render kept showing yesterday.
// Timers are throttled while the app is hidden, so coming back into view
// checks the date too.
export function useToday() {
  const [today, setToday] = useState(() => toISODate(new Date()));

  useEffect(() => {
    const refresh = () => setToday(toISODate(new Date()));
    const timer = setTimeout(refresh, msUntilMidnight());
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [today]);

  return today;
}
