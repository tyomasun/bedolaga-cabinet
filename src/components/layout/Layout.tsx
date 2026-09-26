import { lazy, Suspense, type ComponentType } from 'react';
import PageLoader from '../common/PageLoader';

interface LayoutProps {
  children: React.ReactNode;
}

function lazyLayoutWithRetry(factory: () => Promise<{ default: ComponentType<LayoutProps> }>) {
  return lazy(() =>
    factory().catch(() => {
      const key = 'layout_chunk_reload_ts';
      const last = Number(sessionStorage.getItem(key) || '0');
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
      return factory();
    }),
  );
}

const AppShell = lazyLayoutWithRetry(() =>
  import('./AppShell').then((module) => ({ default: module.AppShell })),
);

/**
 * Main layout component that wraps all pages.
 * Uses the new AppShell system with:
 * - Desktop sidebar navigation
 * - Mobile bottom navigation
 * - Command palette (⌘K)
 * - Platform-aware features (Telegram integration)
 */
export default function Layout({ children }: LayoutProps) {
  return (
    <Suspense fallback={<PageLoader variant="dark" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
