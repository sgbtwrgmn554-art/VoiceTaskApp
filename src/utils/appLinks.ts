export interface AppLink {
  name: string;
  nameHe: string;
  emoji: string;
  scheme: string;
  keywords: string[];
}

export const APP_LINKS: AppLink[] = [
  { name: 'WhatsApp',     nameHe: 'וואטסאפ',  emoji: '💬', scheme: 'https://wa.me/',             keywords: ['whatsapp', 'וואטסאפ', 'ווצ', 'ואצ'] },
  { name: 'YouTube',      nameHe: 'יוטיוב',    emoji: '📺', scheme: 'https://youtube.com',         keywords: ['youtube', 'יוטיוב', 'you'] },
  { name: 'Instagram',    nameHe: 'אינסטגרם',  emoji: '📸', scheme: 'https://instagram.com',       keywords: ['instagram', 'insta', 'אינסטגרם', 'אינסטה'] },
  { name: 'Waze',         nameHe: 'וויז',       emoji: '🗺️', scheme: 'waze://',                    keywords: ['waze', 'וויז', 'ניווט'] },
  { name: 'Google Maps',  nameHe: 'מפות',       emoji: '📍', scheme: 'https://maps.google.com',    keywords: ['maps', 'מפות', 'google maps', 'גוגל מפות'] },
  { name: 'Phone',        nameHe: 'טלפון',      emoji: '📞', scheme: 'tel:',                       keywords: ['tel', 'phone', 'טלפון', 'שיחה', 'call'] },
  { name: 'Email',        nameHe: 'מייל',       emoji: '📧', scheme: 'mailto:',                    keywords: ['email', 'mail', 'מייל', 'אימייל', 'gmail', 'גמייל'] },
  { name: 'Spotify',      nameHe: 'ספוטיפיי',  emoji: '🎵', scheme: 'https://open.spotify.com',   keywords: ['spotify', 'ספוטיפיי', 'ספוטיפי', 'music', 'מוזיקה'] },
  { name: 'Netflix',      nameHe: 'נטפליקס',   emoji: '🎬', scheme: 'https://netflix.com',         keywords: ['netflix', 'נטפליקס'] },
  { name: 'TikTok',       nameHe: 'טיקטוק',    emoji: '🎭', scheme: 'https://tiktok.com',          keywords: ['tiktok', 'טיקטוק'] },
  { name: 'Telegram',     nameHe: 'טלגרם',     emoji: '✈️', scheme: 'https://t.me/',              keywords: ['telegram', 'טלגרם'] },
  { name: 'Facebook',     nameHe: 'פייסבוק',   emoji: '👥', scheme: 'https://facebook.com',        keywords: ['facebook', 'fb', 'פייסבוק'] },
  { name: 'Twitter / X',  nameHe: 'טוויטר',    emoji: '🐦', scheme: 'https://x.com',              keywords: ['twitter', 'x', 'טוויטר'] },
  { name: 'LinkedIn',     nameHe: 'לינקדאין',  emoji: '💼', scheme: 'https://linkedin.com',        keywords: ['linkedin', 'לינקדאין'] },
  { name: 'FaceTime',     nameHe: 'פייסטיים',  emoji: '📱', scheme: 'facetime:',                  keywords: ['facetime', 'פייסטיים', 'וידאו'] },
  { name: 'Amazon',       nameHe: 'אמזון',      emoji: '🛒', scheme: 'https://amazon.com',          keywords: ['amazon', 'אמזון'] },
  { name: 'Google',       nameHe: 'גוגל',       emoji: '🔍', scheme: 'https://google.com/search?q=', keywords: ['google', 'גוגל', 'חיפוש', 'search'] },
  { name: 'Calendar',     nameHe: 'יומן',       emoji: '📅', scheme: 'calshow:',                   keywords: ['calendar', 'יומן', 'לוח שנה'] },
];

export function searchApps(query: string): AppLink[] {
  const q = query.toLowerCase().trim();
  if (!q) return APP_LINKS.slice(0, 8);
  return APP_LINKS.filter(app =>
    app.name.toLowerCase().includes(q) ||
    app.nameHe.includes(q) ||
    app.keywords.some(k => k.includes(q))
  );
}

export function getAppFromUrl(url: string): AppLink | undefined {
  if (!url) return undefined;
  return APP_LINKS.find(app => url.startsWith(app.scheme));
}

export function openLink(url: string) {
  if (!url) return;
  window.open(url, '_blank', 'noopener noreferrer');
}
