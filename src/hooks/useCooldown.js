import { useCallback, useEffect, useState } from 'react';

export function useCooldown(durationMs) {
  const [until, setUntil] = useState(0);

  useEffect(() => {
    if (!until) return undefined;
    const timer = setTimeout(() => setUntil(0), Math.max(0, until - Date.now()));
    return () => clearTimeout(timer);
  }, [until]);

  const start = useCallback(() => setUntil(Date.now() + durationMs), [durationMs]);

  return { active: Date.now() < until, start };
}
