import { useCallback, useState } from "react";

const KEY = "marginalia:onboarded";

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // If storage is unavailable, show the tour rather than hiding it.
    return false;
  }
}

export function useOnboarding() {
  const [seen, setSeen] = useState(read);

  const finish = useCallback(() => {
    setSeen(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Not remembering it is better than blocking the app.
    }
  }, []);

  const replay = useCallback(() => setSeen(false), []);

  return { showTour: !seen, finish, replay };
}
