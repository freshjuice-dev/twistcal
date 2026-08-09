/**
 * TwistCal — Built-in translations.
 * Language is auto-detected from <html lang> or navigator.language.
 */

export const translations = {
  en: {
    label: 'Add to Calendar',
    services: {
      google: 'Google Calendar',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Calendar',
      ical: 'Apple Calendar (.ics)',
    },
  },

  de: {
    label: 'Zum Kalender hinzufügen',
    services: {
      google: 'Google Kalender',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Kalender',
      ical: 'Apple Kalender (.ics)',
    },
  },

  es: {
    label: 'Añadir al calendario',
    services: {
      google: 'Google Calendar',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Calendar',
      ical: 'Calendar de Apple (.ics)',
    },
  },

  fr: {
    label: 'Ajouter au calendrier',
    services: {
      google: 'Google Agenda',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Agenda',
      ical: 'Calendar Apple (.ics)',
    },
  },

  it: {
    label: 'Aggiungi al calendario',
    services: {
      google: 'Google Calendar',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Calendar',
      ical: 'Calendar Apple (.ics)',
    },
  },

  pt: {
    label: 'Adicionar ao calendário',
    services: {
      google: 'Google Agenda',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Agenda',
      ical: 'Calendar Apple (.ics)',
    },
  },

  nl: {
    label: 'Toevoegen aan agenda',
    services: {
      google: 'Google Agenda',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Agenda',
      ical: 'Apple Agenda (.ics)',
    },
  },

  pl: {
    label: 'Dodaj do kalendarza',
    services: {
      google: 'Google Kalendarz',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Kalendarz',
      ical: 'Kalendarz Apple (.ics)',
    },
  },

  uk: {
    label: 'Додати до календаря',
    services: {
      google: 'Google Календар',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Календар',
      ical: 'Календар Apple (.ics)',
    },
  },

  ru: {
    label: 'Добавить в календарь',
    services: {
      google: 'Google Календарь',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo Календарь',
      ical: 'Календарь Apple (.ics)',
    },
  },

  ja: {
    label: 'カレンダーに追加',
    services: {
      google: 'Google カレンダー',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo カレンダー',
      ical: 'Apple カレンダー (.ics)',
    },
  },

  zh: {
    label: '添加到日历',
    services: {
      google: 'Google 日历',
      outlook: 'Microsoft Outlook',
      yahoo: 'Yahoo 日历',
      ical: 'Apple 日历 (.ics)',
    },
  },
};

/** Supported language codes */
export const supportedLanguages = Object.keys(translations);

/**
 * Detect language from various sources.
 * Priority: lang arg > <html lang> > navigator.language > 'en'
 */
export function detectLanguage(configLang) {
  if (configLang && configLang !== 'auto') return normalizeLanguage(configLang);

  if (typeof document !== 'undefined' && document.documentElement.lang) {
    const normalized = normalizeLanguage(document.documentElement.lang);
    if (translations[normalized]) return normalized;
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    const normalized = normalizeLanguage(navigator.language);
    if (translations[normalized]) return normalized;
  }

  return 'en';
}

/** Normalize language code (e.g. 'en-US' -> 'en', 'es_MX' -> 'es') */
function normalizeLanguage(lang) {
  if (!lang) return 'en';
  const base = lang.slice(0, 2).toLowerCase();
  if (translations[base]) return base;
  return 'en';
}

/** Get translation for a language, fallback to English */
export function getTranslation(lang) {
  return translations[lang] || translations.en;
}