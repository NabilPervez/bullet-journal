import { useEffect, useState } from "react";

// Three tiers, not one 900px cliff: a 375pt phone and a 768pt tablet in
// portrait were getting the identical layout.
export const COMPACT_MAX = 599;
export const MEDIUM_MAX = 899;

function read() {
  if (typeof window === "undefined") return "expanded";
  const width = window.innerWidth;
  if (width <= COMPACT_MAX) return "compact";
  if (width <= MEDIUM_MAX) return "medium";
  return "expanded";
}

export function useViewport() {
  const [tier, setTier] = useState(read);

  useEffect(() => {
    const compact = window.matchMedia(`(max-width: ${COMPACT_MAX}px)`);
    const medium = window.matchMedia(`(max-width: ${MEDIUM_MAX}px)`);
    const update = () => setTier(read());

    compact.addEventListener("change", update);
    medium.addEventListener("change", update);
    return () => {
      compact.removeEventListener("change", update);
      medium.removeEventListener("change", update);
    };
  }, []);

  return tier;
}

export function useIsCompact() {
  return useViewport() === "compact";
}
