import { useMemo, useState } from "react";

// PUBLIC_INTERFACE
export default function useHelpCenter() {
  /** Hook to manage help center modal state. */
  const [isOpen, setIsOpen] = useState(false);
  return useMemo(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );
}
