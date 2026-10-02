/**
 * Indonesian Rupiah formatting helpers.
 *
 * Compact:  Rp13 jt   (millions)  /  Rp450 rb  (thousands)
 * Full:     Rp13.000.000
 */

const IDR_LOCALE = "id-ID";

/** Full IDR format: Rp13.000.000 */
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat(IDR_LOCALE, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Compact IDR: Rp13 jt / Rp450 rb / Rp950 */
export function formatIDRCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `Rp${val % 1 === 0 ? val : val.toFixed(1)} M`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `Rp${val % 1 === 0 ? val : val.toFixed(1)} jt`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `Rp${val % 1 === 0 ? val : val.toFixed(1)} rb`;
  }
  return `Rp${amount.toLocaleString(IDR_LOCALE)}`;
}

/**
 * Shorten an opaque identifier (Gmail message ID, Calendar event ID) for display.
 * "gh3tc7947al23khnk2agspesng" → "gh3tc7…esng"
 */
export function shortenId(id: string | null | undefined, head = 6, tail = 4): string | null {
  if (!id) return null;
  const trimmed = id.trim();
  if (!trimmed) return null;
  if (trimmed.length <= head + tail + 1) return trimmed;
  return `${trimmed.slice(0, head)}…${trimmed.slice(-tail)}`;
}
