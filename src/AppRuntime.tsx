import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  offBackButtonClick,
} from '@telegram-apps/sdk-react';
import { useQuery } from '@tanstack/react-query';
import Twemoji from 'react-twemoji';
import { WebSocketProvider } from './providers/WebSocketProvider';
import { ToastProvider } from './components/Toast';
import { TooltipProvider } from './components/primitives/Tooltip';
import { isInTelegramWebApp, closeTelegramApp } from './hooks/useTelegramSDK';
import { getFallbackParentPath } from './utils/navigation';
import { subscriptionApi } from './api/subscription';
import { useBlockingStore } from './store/blocking';

const TWEMOJI_OPTIONS = { className: 'twemoji', folder: 'svg', ext: '.svg' } as const;

/** Pages reachable from bottom nav — treat as top-level (no back button). */
const BOTTOM_NAV_PATHS = ['/', '/subscriptions', '/balance', '/referral', '/support', '/wheel'];

/** Matches /subscriptions/:numericId. */
const SUBSCRIPTION_DETAIL_RE = /^\/subscriptions\/\d+\/?$/;

function TelegramBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const blockingType = useBlockingStore((state) => state.blockingType);
  const blockingTypeRef = useRef(blockingType);
  blockingTypeRef.current = blockingType;

  const depthRef = useRef(0);
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastKeyRef.current === location.key) return;
    lastKeyRef.current = location.key;
    if (navType === 'PUSH') depthRef.current += 1;
    else if (navType === 'POP') depthRef.current = Math.max(0, depthRef.current - 1);
  }, [location.key, navType]);

  const { data: subData } = useQuery({
    queryKey: ['subscriptions-list'],
    queryFn: () => subscriptionApi.getSubscriptions(),
    staleTime: 30_000,
    enabled: isInTelegramWebApp(),
  });
  const isMultiTariff = subData?.multi_tariff_enabled ?? false;
  const subsCount = subData?.subscriptions?.length ?? 0;
  const listRedirectsToDetail = !isMultiTariff && subsCount <= 1;

  const isMultiTariffRef = useRef(isMultiTariff);
  isMultiTariffRef.current = isMultiTariff;
  const subsCountRef = useRef(subsCount);
  subsCountRef.current = subsCount;

  useEffect(() => {
    if (blockingType) {
      try {
        showBackButton();
      } catch {}
      return;
    }
    const isTopLevel = location.pathname === '' || BOTTOM_NAV_PATHS.includes(location.pathname);
    const isRedirectingSubscriptionDetail =
      listRedirectsToDetail && SUBSCRIPTION_DETAIL_RE.test(location.pathname);
    try {
      if (isTopLevel || isRedirectingSubscriptionDetail) {
        hideBackButton();
      } else {
        showBackButton();
      }
    } catch {}
  }, [location, listRedirectsToDetail, blockingType]);

  const handler = useCallback(() => {
    if (blockingTypeRef.current) {
      closeTelegramApp();
      return;
    }
    if (depthRef.current > 0) {
      navigateRef.current(-1);
      return;
    }
    const pathname = pathnameRef.current;
    const listIsSafe = isMultiTariffRef.current || subsCountRef.current > 1;
    const fallback =
      SUBSCRIPTION_DETAIL_RE.test(pathname) && !listIsSafe
        ? '/'
        : getFallbackParentPath(pathnameRef.current);
    navigateRef.current(fallback, { replace: true });
  }, []);

  useEffect(() => {
    try {
      onBackButtonClick(handler);
    } catch {}
    return () => {
      try {
        offBackButtonClick(handler);
      } catch {}
    };
  }, [handler]);

  return null;
}

export default function AppRuntime({ children }: { children: ReactNode }) {
  const isTelegram = isInTelegramWebApp();

  return (
    <>
      {isTelegram && <TelegramBackButton />}
      <TooltipProvider>
        <ToastProvider>
          <WebSocketProvider>
            <Twemoji options={TWEMOJI_OPTIONS}>{children}</Twemoji>
          </WebSocketProvider>
        </ToastProvider>
      </TooltipProvider>
    </>
  );
}
