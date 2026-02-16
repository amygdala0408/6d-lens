import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lens-paper">
      <div className="text-center max-w-md px-6">
        <div className="font-display text-9xl text-lens-red leading-none mb-4">404</div>
        <h1 className="font-display text-4xl mb-3">PAGE NOT FOUND</h1>
        <p className="text-sm text-lens-grey leading-relaxed mb-8">
          This page doesn&apos;t exist. The 6D Lens evaluation tool lives on the homepage.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-lens-ink text-white font-display text-2xl tracking-wider hover:bg-lens-red transition-colors"
        >
          BACK TO 6D LENS
        </Link>
      </div>
    </div>
  );
}
