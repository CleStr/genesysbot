/**
 * Lightweight language-mix detection (P3 QA).
 *
 * Heuristic check for English passages in German assistant replies.
 * Runs entirely client-side — no additional LLM calls. Words that also
 * exist in German (e.g. "also", "still", "will", "was", "bad", "job",
 * "okay", "cool", "kids", "live") are deliberately excluded to avoid
 * false positives.
 */

// English function words that never occur as standalone German words.
const ENGLISH_WORDS = [
  "the", "and", "with", "because", "about", "would", "could", "should",
  "people", "really", "very", "know", "want", "need", "make", "think",
  "energy", "money", "work", "home", "family", "children", "school",
  "water", "food", "house", "city", "country", "year", "week", "today",
  "world", "life", "many", "only", "just", "never", "always", "often",
  "thanks", "sorry", "please", "hello", "yes", "not", "but", "then",
  "than", "more", "most", "some", "every", "other", "same", "there",
  "here", "what", "when", "where", "why", "how", "this", "that",
  "these", "those", "they", "them", "their", "time", "day", "night",
  "summer", "winter", "cold", "hot", "big", "small", "new", "old",
  "long", "short", "much", "few", "both", "such", "own", "too", "well",
];

// Strong multi-word markers — a single hit is enough to flag.
const ENGLISH_PHRASES = [
  "i am", "you are", "we are", "i think", "you know", "of course",
  "a lot of", "kind of", "sort of", "in order to", "as well",
  "at the moment", "for example", "let me", "i'm sorry",
];

export interface LanguageMixResult {
  /** True when the text likely contains English passages. */
  detected: boolean;
  /** The distinct markers that were found (for QA reporting). */
  markers: string[];
}

/** Detect English passages inside a German reply. */
export function detectEnglishMix(text: string): LanguageMixResult {
  const lower = text.toLowerCase();
  const markers: string[] = [];

  for (const phrase of ENGLISH_PHRASES) {
    if (lower.includes(phrase)) markers.push(phrase);
  }
  const phraseHit = markers.length > 0;

  for (const word of ENGLISH_WORDS) {
    const re = new RegExp(`\\b${word}\\b`);
    if (re.test(lower)) markers.push(word);
  }

  // A single word can be a quote or a name; two distinct markers
  // (or any phrase marker) indicate a real language mix.
  const detected = phraseHit || new Set(markers).size >= 2;
  return { detected, markers: [...new Set(markers)] };
}
