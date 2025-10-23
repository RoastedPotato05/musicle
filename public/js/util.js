// normalization helper for comparing guesses
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/’/g, "'")
    .replace(/[^\w\s]/g, '')  // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// loose match: checks if normalized guess contains major words of answer
function looseMatch(guess, answer) {
  const g = normalize(guess);
  const a = normalize(answer);
  if (!g || !a) return false;
  if (g === a) return true;
  // require at least one substantial word match OR the guess be contained
  if (a.includes(g)) return true;
  const awords = a.split(' ').filter(w => w.length > 2);
  const gw = g.split(' ').filter(w => w.length > 2);
  if (!awords.length || !gw.length) return false;
  const matches = awords.filter(w => gw.includes(w));
  return matches.length >= 1;
}
