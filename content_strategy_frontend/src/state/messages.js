import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AppMessageContext = createContext(null);

/**
 * Message kinds used to render and announce feedback.
 * - "live" controls aria-live politeness for screen readers.
 */
function normalizeMessage(msg) {
  return {
    id: msg.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: msg.kind || 'info', // info | success | error
    messageKey: msg.messageKey || '',
    params: msg.params || {},
    live: msg.live || (msg.kind === 'error' ? 'assertive' : 'polite'),
    createdAt: msg.createdAt || Date.now()
  };
}

// PUBLIC_INTERFACE
export function AppMessageProvider({ children }) {
  /** Provides a centralized message queue for accessible, localized user feedback. */
  const [messages, setMessages] = useState([]);

  const pushMessage = useCallback((msg) => {
    const normalized = normalizeMessage(msg);
    setMessages((prev) => [normalized, ...prev].slice(0, 3));
    // Auto-dismiss info/success after a short delay; keep errors longer.
    const ttlMs = normalized.kind === 'error' ? 9000 : 4500;
    window.setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== normalized.id));
    }, ttlMs);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      pushMessage
    }),
    [messages, pushMessage]
  );

  return (
    <AppMessageContext.Provider value={value}>
      {children}
    </AppMessageContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useAppMessages() {
  /** Hook to interact with the global message system. */
  const ctx = useContext(AppMessageContext);
  if (!ctx) throw new Error('useAppMessages must be used within AppMessageProvider');
  return ctx;
}
