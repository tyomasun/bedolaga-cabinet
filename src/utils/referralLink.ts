const DEFAULT_REFERRAL_BASE_URL = 'https://zabugrom.net';

export function buildReferralLink(referralCode?: string | null): string {
  if (!referralCode) return '';

  const baseUrl = (import.meta.env.VITE_REFERRAL_BASE_URL || DEFAULT_REFERRAL_BASE_URL).replace(
    /\/+$/,
    '',
  );

  return `${baseUrl}/login?ref=${encodeURIComponent(referralCode)}`;
}
