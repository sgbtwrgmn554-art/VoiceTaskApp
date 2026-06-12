import { ParsedReminder, RecurrenceType } from '../types';

/**
 * Parses natural language reminder text (Hebrew and English) into structured reminder data.
 */
export function parseReminderFromText(text: string): ParsedReminder | null {
  const lower = text.toLowerCase();
  let date: string | undefined;
  let time: string | undefined;
  let recurrence: RecurrenceType = 'none';
  let found = false;

  // Detect recurrence
  if (/כל יום|every day|daily|יומי/.test(lower)) {
    recurrence = 'daily';
    found = true;
  } else if (/כל שבוע|every week|weekly|שבועי|monday|tuesday|wednesday|thursday|friday|שני|שלישי|רביעי|חמישי|שישי/.test(lower)) {
    recurrence = 'weekly';
    found = true;
  } else if (/כל חודש|every month|monthly|חודשי/.test(lower)) {
    recurrence = 'monthly';
    found = true;
  } else if (/כל 3 חודשים|every 3 months|quarterly/.test(lower)) {
    recurrence = 'every3months';
    found = true;
  } else if (/חצי שנה|half.?year|every 6 months/.test(lower)) {
    recurrence = 'halfyear';
    found = true;
  } else if (/כל שנה|every year|yearly|annually/.test(lower)) {
    recurrence = 'yearly';
    found = true;
  }

  // Parse time
  // Hebrew: "ב-12 בבוקר", "ב-3 בצהריים", "ב-9 בלילה"
  // English: "at 3pm", "at 9am", "at 15:00"
  const hebrewTimeMatch = text.match(/ב[-–]?(\d{1,2})(?::(\d{2}))?\s*(בבוקר|בצהריים|אחרי הצהריים|בערב|בלילה)?/);
  const englishTimeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const time24Match = text.match(/(\d{1,2}):(\d{2})/);

  if (hebrewTimeMatch) {
    let hour = parseInt(hebrewTimeMatch[1]);
    const minute = hebrewTimeMatch[2] ? parseInt(hebrewTimeMatch[2]) : 0;
    const period = hebrewTimeMatch[3];
    if (period === 'בצהריים' || period === 'אחרי הצהריים' || period === 'בערב') {
      if (hour < 12) hour += 12;
    } else if (period === 'בלילה' && hour < 9) {
      hour += 12;
    }
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    found = true;
  } else if (englishTimeMatch) {
    let hour = parseInt(englishTimeMatch[1]);
    const minute = englishTimeMatch[2] ? parseInt(englishTimeMatch[2]) : 0;
    const ampm = englishTimeMatch[3];
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    found = true;
  } else if (time24Match) {
    time = `${String(parseInt(time24Match[1])).padStart(2, '0')}:${time24Match[2]}`;
    found = true;
  }

  // Parse date
  const today = new Date();

  if (/מחר|tomorrow/.test(lower)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    date = formatDate(tomorrow);
    found = true;
  } else if (/היום|today/.test(lower)) {
    date = formatDate(today);
    found = true;
  } else if (/בעוד שבוע|next week|in a week/.test(lower)) {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    date = formatDate(nextWeek);
    found = true;
  } else {
    // Try to match a specific date like "15 ביוני" or "June 15" or "15/06"
    const dateSlashMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (dateSlashMatch) {
      const day = parseInt(dateSlashMatch[1]);
      const month = parseInt(dateSlashMatch[2]) - 1;
      const year = dateSlashMatch[3] ? parseInt(dateSlashMatch[3]) : today.getFullYear();
      const d = new Date(year < 100 ? 2000 + year : year, month, day);
      date = formatDate(d);
      found = true;
    }

    // Hebrew months
    const hebrewMonths: { [key: string]: number } = {
      'ינואר': 0, 'פברואר': 1, 'מרץ': 2, 'אפריל': 3, 'מאי': 4, 'יוני': 5,
      'יולי': 6, 'אוגוסט': 7, 'ספטמבר': 8, 'אוקטובר': 9, 'נובמבר': 10, 'דצמבר': 11
    };
    for (const [hMonth, monthIdx] of Object.entries(hebrewMonths)) {
      const hMatch = text.match(new RegExp(`(\\d{1,2})\\s*(ב)?${hMonth}`));
      if (hMatch) {
        const d = new Date(today.getFullYear(), monthIdx, parseInt(hMatch[1]));
        if (d < today) d.setFullYear(d.getFullYear() + 1);
        date = formatDate(d);
        found = true;
        break;
      }
    }

    // English months
    const englishMonths: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'jun': 5, 'jul': 6,
      'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
    };
    for (const [eMonth, monthIdx] of Object.entries(englishMonths)) {
      const eMatch = lower.match(new RegExp(`(?:${eMonth})\\s+(\\d{1,2})|(\\d{1,2})\\s+(?:${eMonth})`));
      if (eMatch) {
        const dayStr = eMatch[1] || eMatch[2];
        const d = new Date(today.getFullYear(), monthIdx, parseInt(dayStr));
        if (d < today) d.setFullYear(d.getFullYear() + 1);
        date = formatDate(d);
        found = true;
        break;
      }
    }
  }

  if (!found) return null;

  // Default date to today if we only found time/recurrence
  if (!date && (time || recurrence !== 'none')) {
    date = formatDate(today);
  }

  return {
    date,
    time: time || '09:00',
    recurrence,
    raw: text,
  };
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
