// Auth
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  voicePreference: string | null;
  preferredLanguage: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface GoogleAuthRequest {
  idToken: string;
  deviceInfo?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

// Vocabulary
export interface VocabSet {
  id: string;
  name: string;
  description: string | null;
  targetLanguage: string;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVocabSetRequest {
  name: string;
  description?: string;
  targetLanguage?: string;
}

export interface VocabEntry {
  id: string;
  word: string;
  language: string;
  customDefinition: string | null;
  customPhonetic: string | null;
  dictionaryData: DictionaryData | null;
  createdAt: string;
}

export interface DictionaryData {
  phoneticText: string;
  audioUrl: string | null;
  meanings: DictionaryMeaning[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definition: string;
  example: string | null;
}

export interface CreateVocabEntryRequest {
  word: string;
  language?: string;
  customDefinition?: string;
  customPhonetic?: string;
}

// Review / Spaced Repetition
export interface ReviewCard {
  id: string;
  vocabEntryId: string;
  word: string;
  language: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
}

export interface ReviewSubmitRequest {
  reviewCardId: string;
  quality: ReviewQuality;
}

export interface ReviewStats {
  dueToday: number;
  reviewedToday: number;
  totalCards: number;
  currentStreak: number;
}

export type ReviewQuality = 1 | 3 | 4 | 5;

export interface WordListItem {
  reviewCardId: string;
  vocabEntryId: string;
  word: string;
  language: string;
  phoneticText: string | null;
  firstDefinition: string | null;
  firstPartOfSpeech: string | null;
  customDefinition: string | null;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  createdAt: string;
}
