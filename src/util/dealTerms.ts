import { getTranslationFn } from './localization';

export type DealTermsStatus = 'pending' | 'agreed';

export type DealTerms = {
  id: string;
  version: number;
  status: DealTermsStatus;
  what: string;
  price?: string;
  due?: string;
  includes?: string;
  excludes?: string;
  // When both sides agreed, in seconds
  agreedAt?: number;
};

// The card travels as an ordinary message: a readable body for any client that does not
// know about it, and one machine-readable line at the end
const MARKER = '#deal-terms:';

export function parseDealTerms(text?: string): DealTerms | undefined {
  if (!text?.includes(MARKER)) return undefined;

  const markerIndex = text.lastIndexOf(MARKER);
  const payload = text.slice(markerIndex + MARKER.length).trim();

  try {
    const parsed = JSON.parse(payload) as DealTerms;
    const isValid = parsed
      && typeof parsed.id === 'string'
      && typeof parsed.version === 'number'
      && typeof parsed.what === 'string'
      && (parsed.status === 'pending' || parsed.status === 'agreed');

    return isValid ? parsed : undefined;
  } catch (err) {
    return undefined;
  }
}

export function buildDealTermsText(terms: DealTerms) {
  const lang = getTranslationFn();

  const lines = [
    `${lang('DealTermsTitle')} · ${lang('DealTermsVersion', { version: terms.version })}`,
    `${lang('DealTermsWhat')}: ${terms.what}`,
  ];

  if (terms.price) lines.push(`${lang('DealTermsPrice')}: ${terms.price}`);
  if (terms.due) lines.push(`${lang('DealTermsDue')}: ${terms.due}`);
  if (terms.includes) lines.push(`${lang('DealTermsIncludes')}: ${terms.includes}`);
  if (terms.excludes) lines.push(`${lang('DealTermsExcludes')}: ${terms.excludes}`);

  lines.push(terms.status === 'agreed' ? lang('DealTermsStatusAgreedShort') : lang('DealTermsStatusPending'));
  lines.push(`${MARKER}${JSON.stringify(terms)}`);

  return lines.join('\n');
}

export function buildNextDealTermsVersion(terms: DealTerms, changes: Partial<DealTerms>): DealTerms {
  return {
    ...terms,
    ...changes,
    version: terms.version + 1,
    status: 'pending',
    agreedAt: undefined,
  };
}

export function generateDealTermsId() {
  return Math.random().toString(36).slice(2, 10);
}
