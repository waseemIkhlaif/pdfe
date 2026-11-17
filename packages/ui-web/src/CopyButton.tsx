'use client';

import { useState } from 'react';

/**
 * Copies `value` to the clipboard and says so. The two labels come from the caller, already in the language of the page.
 * It needs the browser, so it is a client component; everything around it can stay on the server.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-testid="copy-correlation-id"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false); // the browser refused (no permission or no secure context): the ID is still on screen
        }
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
