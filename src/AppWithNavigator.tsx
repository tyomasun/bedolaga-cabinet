import { lazy, Suspense } from 'react';
import { BrowserRouter, useLocation } from 'react-router';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import PageLoader from './components/common/PageLoader';
import { PlatformProvider } from './platform/PlatformProvider';
import { ThemeColorsProvider } from './providers/ThemeColorsProvider';
const LEAN_PUBLIC_PATHS = new Set([
  '/login',
  '/auth/telegram/callback',
  '/auth/telegram',
  '/tg',
  '/connect',
  '/add',
  '/auth/oauth/callback',
  '/verify-email',
  '/reset-password',
]);

const AppRuntime = lazy(() =>
  import('./AppRuntime').catch(() => {
    const key = 'runtime_chunk_reload_ts';
    const last = Number(sessionStorage.getItem(key) || '0');
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
    return import('./AppRuntime');
  }),
);

function RouteAwareApp() {
  const location = useLocation();
  const isLeanPublicRoute = LEAN_PUBLIC_PATHS.has(location.pathname);

  return (
    <ErrorBoundary level="page">
      <PlatformProvider>
        <ThemeColorsProvider>
          {isLeanPublicRoute ? (
            <App />
          ) : (
            <Suspense fallback={<PageLoader variant="dark" />}>
              <AppRuntime>
                <App />
              </AppRuntime>
            </Suspense>
          )}
        </ThemeColorsProvider>
      </PlatformProvider>
    </ErrorBoundary>
  );
}

export function AppWithNavigator() {
  return (
    <BrowserRouter>
      <RouteAwareApp />
    </BrowserRouter>
  );
}
