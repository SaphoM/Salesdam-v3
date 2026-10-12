/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Lower score = closer match
 */
const levenshteinDistance = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
};

/**
 * Calculate similarity score between two strings (0-100)
 * Higher score = better match
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 100;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 90;

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  // Convert distance to similarity percentage
  const similarity = ((maxLength - distance) / maxLength) * 100;
  return Math.max(0, similarity);
};

/**
 * Find the best fuzzy match from a list of items
 * Returns { item, score } of the best match
 */
export const fuzzyMatchBest = (searchTerm, items, getItemLabel) => {
  if (!searchTerm || !items || items.length === 0) {
    return { item: null, score: 0 };
  }

  let bestMatch = { item: null, score: 0 };

  items.forEach((item) => {
    const label = getItemLabel(item);
    const score = calculateSimilarity(searchTerm, label);

    if (score > bestMatch.score) {
      bestMatch = { item, score };
    }
  });

  return bestMatch;
};

/**
 * Filter and rank items by fuzzy match similarity
 * Returns array sorted by similarity score (highest first)
 */
export const fuzzyMatch = (searchTerm, items, getItemLabel, minScore = 0) => {
  if (!searchTerm || !items || items.length === 0) {
    return [];
  }

  const results = items
    .map((item) => ({
      item,
      score: calculateSimilarity(searchTerm, getItemLabel(item)),
    }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return results;
};

/**
 * Get the best match if score is above threshold
 */
export const fuzzyMatchIfGood = (searchTerm, items, getItemLabel, threshold = 70) => {
  const bestMatch = fuzzyMatchBest(searchTerm, items, getItemLabel);
  return bestMatch.score >= threshold ? bestMatch.item : null;
};
