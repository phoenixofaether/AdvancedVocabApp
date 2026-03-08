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

// Cambridge English Exercises
export type CambridgeLevel = 'B2First' | 'C1Advanced' | 'C2Proficiency';

export type CambridgeExerciseType =
  | 'OpenCloze'
  | 'MultipleChoiceCloze'
  | 'WordFormation'
  | 'KeyWordTransformations'
  | 'MultipleChoice'
  | 'GappedText'
  | 'MultipleMatching'
  | 'Essay'
  | 'Article'
  | 'Letter'
  | 'Report'
  | 'Review'
  | 'Proposal';

export interface ExerciseTypeInfo {
  type: CambridgeExerciseType;
  category: string;
  displayName: string;
  description: string;
  availableLevels: CambridgeLevel[];
}

export interface GenerateExerciseRequest {
  level: CambridgeLevel;
  exerciseType: CambridgeExerciseType;
}

export interface ExerciseResponse {
  id: string;
  level: CambridgeLevel;
  exerciseType: CambridgeExerciseType;
  contentJson: string;
  generatedAt: string;
}

export interface SubmitAttemptRequest {
  exerciseId: string;
  answerJson: string;
  timeSpentSeconds?: number;
}

export interface AttemptResponse {
  id: string;
  exerciseId: string;
  level: CambridgeLevel;
  exerciseType: CambridgeExerciseType;
  answerJson: string;
  contentJson: string;
  score: number | null;
  feedbackJson: string | null;
  timeSpentSeconds: number | null;
  submittedAt: string;
}

export interface SkillProfileEntry {
  level: CambridgeLevel;
  exerciseType: CambridgeExerciseType;
  attemptCount: number;
  averageScore: number;
  lastAttemptAt: string | null;
}

// Parsed Cambridge content (from contentJson / feedbackJson)
export interface CambridgeBlank {
  number: number;
  correctAnswer?: string;
  options: string[] | null;
  baseWord: string | null;
  explanation?: string;
}

export interface CambridgeSentence {
  number: number;
  originalSentence: string;
  keyword: string;
  gappedSentence: string;
  correctAnswer?: string;
  explanation?: string;
}

export interface CambridgePassage {
  id: string;
  title: string;
  text: string;
}

export interface CambridgeRemovedSentence {
  id: string;
  text: string;
}

export interface CambridgeQuestion {
  number: number;
  text: string;
  options: string[];
  correctAnswer?: string;
  passageId: string | null;
  explanation?: string;
}

export interface CambridgeExerciseContent {
  instructions: string;
  text: string | null;
  blanks: CambridgeBlank[] | null;
  sentences: CambridgeSentence[] | null;
  passages: CambridgePassage[] | null;
  removedSentences: CambridgeRemovedSentence[] | null;
  questions: CambridgeQuestion[] | null;
  taskDescription: string | null;
  wordLimit: number | null;
  format: string | null;
  assessmentCriteria: string[] | null;
}

export interface WritingCriterionFeedback {
  score: number;
  feedback: string;
}

export interface WritingFeedback {
  content: WritingCriterionFeedback;
  communicativeAchievement: WritingCriterionFeedback;
  organisation: WritingCriterionFeedback;
  language: WritingCriterionFeedback;
  overallFeedback: string;
  modelAnswer: string;
}

export interface StructuredFeedbackItem {
  number: number;
  questionText?: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  baseWord?: string;
}

export interface StructuredFeedback {
  correct: number;
  total: number;
  items: StructuredFeedbackItem[];
}
