export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  tr: 'Turkish',
  ar: 'Arabic',
  hi: 'Hindi',
} as const;

export const LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[];

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export const REVIEW_QUALITY = {
  AGAIN: 1,
  HARD: 3,
  GOOD: 4,
  EASY: 5,
} as const satisfies Record<string, 1 | 3 | 4 | 5>;

export const SM2_DEFAULT_EASE_FACTOR = 2.5;
export const SM2_MIN_EASE_FACTOR = 1.3;
