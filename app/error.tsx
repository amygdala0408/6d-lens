'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-lens-paper">
      <div className="text-center max-w-md px-6">
        <div className="font-display text-8xl text-lens-red mb-4">ERR</div>
        <h1 className="font-display text-4xl mb-3">SOMETHING BROKE</h1>
        <p className="text-sm text-lens-grey leading-relaxed mb-8">
          An unexpected error occurred. This has been logged. 
          You can try again or return to the homepage.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-lens-ink text-white font-display text-xl tracking-wider hover:bg-lens-red transition-colors"
          >
            TRY AGAIN
          </button>
          <a
            href="/"
            className="px-6 py-3 border-2 border-lens-ink font-display text-xl tracking-wider hover:bg-lens-ink hover:text-white transition-colors"
          >
            GO HOME
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 text-xs text-lens-grey">
            Error reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
