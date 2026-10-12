/**
 * Convert singular noun to plural using common English rules
 */
export const pluralize = (singular) => {
  if (!singular || typeof singular !== 'string') return singular;

  const word = singular.trim();
  if (!word) return word;

  // Irregular plurals
  const irregulars = {
    person: 'people',
    man: 'men',
    woman: 'women',
    child: 'children',
    tooth: 'teeth',
    foot: 'feet',
    mouse: 'mice',
    goose: 'geese',
    ox: 'oxen',
  };

  const lower = word.toLowerCase();
  if (irregulars[lower]) {
    return irregulars[lower].charAt(0).toUpperCase() + irregulars[lower].slice(1);
  }

  // Words ending in s, ss, x, z, ch, sh → add es
  if (/^.*(?:s|ss|x|z|ch|sh)$/.test(word)) {
    return word + 'es';
  }

  // Words ending in consonant + y → change y to ies
  if (/^.*[^aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies';
  }

  // Words ending in f or fe → change to ves
  if (/^.*f$/.test(word)) {
    return word.slice(0, -1) + 'ves';
  }
  if (/^.*fe$/.test(word)) {
    return word.slice(0, -2) + 'ves';
  }

  // Words ending in consonant + o → add es
  if (/^.*[^aeiou]o$/.test(word)) {
    return word + 'es';
  }

  // Default: just add s
  return word + 's';
};
