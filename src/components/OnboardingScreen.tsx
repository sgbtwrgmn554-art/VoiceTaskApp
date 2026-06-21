import React, { useState } from 'react';

const SLIDES = [
  {
    emoji: '👋',
    title: 'ברוך הבא!',
    subtitle: 'האפליקציה שלך לניהול חיים חכם',
    desc: 'כל מה שאתה צריך במקום אחד — משימות, הרגלים, יעדים, ועוזר AI קולי.',
    color: '#22c55e',
  },
  {
    emoji: '📋',
    title: 'משימות חכמות',
    subtitle: 'צור משימות בקול או בכתיבה',
    desc: 'לחץ על + בבית, דבר או כתוב — ה-AI מבין, מסווג ומוסיף אוטומטית. אפשר להגדיר עדיפות, קטגוריה ותזכורת עם חלון זמן.',
    color: '#3b82f6',
  },
  {
    emoji: '🤖',
    title: 'J.A.R.V.I.S',
    subtitle: 'עוזר קולי אישי',
    desc: 'לחץ על כפתור המיקרופון בבית. JARVIS יתן לך סיכום יומי, יענה על שאלות, יסמן משימות כבוצע, יתחיל טיימר ריכוז ועוד — הכל בקול.',
    color: '#a855f7',
  },
  {
    emoji: '🔄',
    title: 'הרגלים ורפלקציה',
    subtitle: 'בנה שגרה יומית',
    desc: 'עקוב אחרי הרגלים יומיים ושבועיים, ראה streak, וכתוב רפלקציה יומית עם מה שלמדת ומה אתה אסיר תודה עליו.',
    color: '#f59e0b',
  },
  {
    emoji: '🎯',
    title: 'יעדים ואבני דרך',
    subtitle: 'מה אתה רוצה להשיג?',
    desc: 'הגדר יעדים לפי תחומי חיים (קריירה, בריאות, משפחה...), פרק אותם לאבני דרך, והפוך אותם למשימות.',
    color: '#ef4444',
  },
  {
    emoji: '📅',
    title: 'קלנדר',
    subtitle: 'כל היום שלך במבט אחד',
    desc: 'ראה את ההרגלים והמשימות שלך על ציר זמן יומי. כל דבר במקום הנכון לפי השעה שלו.',
    color: '#14b8a6',
  },
];

interface Props {
  accentColor: string;
  onDone: () => void;
}

export default function OnboardingScreen({ accentColor, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setIdx(i => i + 1);
  };

  const skip = () => onDone();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-between px-6 pb-10 pt-14"
      style={{ background: '#050505' }}
    >
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button onClick={skip} className="text-xs text-gray-500 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          דלג
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 max-w-xs mx-auto">
        {/* Animated emoji orb */}
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center text-5xl slide-in"
          key={idx}
          style={{
            background: `radial-gradient(circle at 40% 35%, ${slide.color}44, ${slide.color}11)`,
            boxShadow: `0 0 50px ${slide.color}33`,
            border: `1px solid ${slide.color}33`,
          }}
        >
          {slide.emoji}
        </div>

        <div className="fade-up" key={`text-${idx}`}>
          <h1 className="text-2xl font-bold text-white mb-1">{slide.title}</h1>
          <p className="text-sm font-semibold mb-3" style={{ color: slide.color }}>{slide.subtitle}</p>
          <p className="text-sm text-gray-400 leading-relaxed">{slide.desc}</p>
        </div>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mb-6">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}>
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? slide.color : 'rgba(255,255,255,0.15)',
              }}
            />
          </button>
        ))}
      </div>

      {/* Next / Start button */}
      <button
        onClick={next}
        className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98]"
        style={{ background: slide.color, color: '#000' }}
      >
        {isLast ? 'בוא נתחיל! 🚀' : 'הבא →'}
      </button>
    </div>
  );
}
