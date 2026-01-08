import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ccch.onboarding.completed';

/**
 * Local-storage persisted onboarding state.
 */

// PUBLIC_INTERFACE
export function readOnboardingCompleted() {
  /** Read persisted onboarding completion value (boolean). */
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export default function useOnboardingState() {
  /** Hook to manage onboarding completion and open/close controls. */
  const [completed, setCompleted] = useState(() => readOnboardingCompleted());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Trigger automatically for first-time visitors.
    if (!completed) setIsOpen(true);
  }, [completed]);

  const markCompleted = useCallback(() => {
    setCompleted(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      completed,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      reset: () => {
        setCompleted(false);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      },
      finish: () => {
        markCompleted();
        setIsOpen(false);
      }
    }),
    [completed, isOpen, markCompleted]
  );

  return value;
}
