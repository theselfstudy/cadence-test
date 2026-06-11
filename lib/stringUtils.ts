/**
 * Calculates Levenshtein distance between two strings
 * Lower number = more similar (0 = exact match)
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if two strings are similar (case-insensitive + fuzzy match)
 * @param a First string
 * @param b Second string
 * @param threshold Max allowed distance (default 2 for short strings)
 * @returns true if strings are similar enough
 */
/**
 * Checks if two strings are similar (case-insensitive + fuzzy match)
 * @param a First string
 * @param b Second string
 * @param threshold Max allowed distance (default calculated based on length)
 * @returns true if strings are similar enough
 */
export function isSimilar(a: string, b: string, threshold?: number): boolean {
  const normalizedA = a.toLowerCase().trim();
  const normalizedB = b.toLowerCase().trim();

  // Exact match (case-insensitive)
  if (normalizedA === normalizedB) return true;

  // Calculate threshold based on string length if not provided
  // More lenient for short words (common medicine names are 4-8 chars)
  // - 1-3 chars: threshold 1
  // - 4-6 chars: threshold 2
  // - 7-10 chars: threshold 3
  // - 11+ chars: threshold 4
  const minLength = Math.min(normalizedA.length, normalizedB.length);
  let autoThreshold: number;
  
  if (threshold !== undefined) {
    autoThreshold = threshold;
  } else if (minLength <= 3) {
    autoThreshold = 1;
  } else if (minLength <= 6) {
    autoThreshold = 2;
  } else if (minLength <= 10) {
    autoThreshold = 3;
  } else {
    autoThreshold = 4;
  }

  // Fuzzy match
  const distance = levenshteinDistance(normalizedA, normalizedB);
  return distance <= autoThreshold;
}

/**
 * Finds similar items in a list
 * @param input The string to check
 * @param list List of existing strings
 * @returns Array of similar items found
 */
export function findSimilarItems(input: string, list: string[]): string[] {
  return list.filter((item) => isSimilar(input, item));
}

/**
 * Checks if an item already exists (case-insensitive exact match)
 */
export function existsCaseInsensitive(input: string, list: string[]): boolean {
  const normalized = input.toLowerCase().trim();
  return list.some((item) => item.toLowerCase().trim() === normalized);
}

/**
 * Finds exact case-insensitive match
 */
export function findExactMatch(input: string, list: string[]): string | undefined {
  const normalized = input.toLowerCase().trim();
  return list.find((item) => item.toLowerCase().trim() === normalized);
}