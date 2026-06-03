import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

export function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa_banner_dismissed') === '1'
  );

  const ios = isIOS();

  useEffect(() => {
    if (isStandalone() || dismissed) return;

    if (ios) {
      // Show manual iOS instructions after a short delay
      const t = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(t);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed, ios]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_banner_dismissed', '1');
    setDismissed(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-24 right-4 left-4 md:left-auto md:w-80 z-50 bg-white rounded-2xl shadow-2xl shadow-indigo-100 border border-indigo-100 p-4 animate-fade-in">
      {ios ? (
        // iPhone instructions
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex-shrink-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">התקיני כאפליקציה — iPhone</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              כדי לקבל התראות WhatsApp על iPhone:
            </p>
            <ol className="text-xs text-gray-600 mt-2 space-y-1 list-none">
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                לחצי על
                <svg className="w-4 h-4 text-blue-500 inline flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="text-blue-500">שתפי</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                בחרי "הוסף למסך הבית"
              </li>
              <li className="flex items-center gap-2">
                <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                פתחי מהאייקון החדש ואפשרי התראות
              </li>
            </ol>
            <button
              onClick={handleDismiss}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              הבנתי, תודה
            </button>
          </div>
        </div>
      ) : (
        // Android / desktop
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex-shrink-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5l-3-3m3 3l3-3m-3 3V10m9 4a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">התקיני כאפליקציה</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              קבלי התראות WhatsApp גם כשהאפליקציה סגורה
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-xl transition-colors"
              >
                התקיני עכשיו
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                אחר כך
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
