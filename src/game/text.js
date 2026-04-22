// Topografie Quiz — text-matching helpers (#95)
//
// Pure functies voor fuzzy naamvergelijking in de typ-modus. Geen DOM,
// geen globals, geen side-effects — 100 % dekkend in test.mjs.
//
//   normalize(s)          lowercase + trim + apostrof/streep/spatie strippen
//   levenshtein(a, b)     klassieke edit-distance (iteratieve DP)
//   typoThreshold(norm)   aantal toegestane typos, groeit met woordlengte
//   matchInput(input, c)  'exact' | 'close' | false — vergelijkt input met
//                         city.name + aliases, respect typo-threshold

export function normalize(s) {
  return s.toLowerCase().trim().replace(/['\-\s]/g, '');
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

export function typoThreshold(normalizedName) {
  const l = normalizedName.length;
  if (l <= 4) return 0;
  if (l <= 8) return 1;
  return 2;
}

export function matchInput(input, city) {
  const normInput = normalize(input);
  if (!normInput) return false;
  const allNames = [city.name, ...(city.aliases || [])];
  for (const name of allNames) {
    if (normalize(name) === normInput) return 'exact';
  }
  for (const name of allNames) {
    const normName = normalize(name);
    const dist = levenshtein(normInput, normName);
    if (dist <= typoThreshold(normName)) return 'close';
  }
  return false;
}
