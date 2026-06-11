// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Pure BM25 over a corpus of {id, text} docs. Standard Robertson/Sparck-Jones
// parameters (k1=1.5, b=0.75). No external deps. Tokenizer drops tokens <= 2
// chars and a small English stopword set.

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with',
]);

const K1 = 1.5;
const B = 0.75;

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export interface ScoredDoc {
  id: string;
  score: number;
}

export function scoreBM25(query: string, docs: Array<{ id: string; text: string }>): ScoredDoc[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return docs.map((d) => ({ id: d.id, score: 0 }));

  const docTokens = docs.map((d) => tokenize(d.text));
  const docLengths = docTokens.map((t) => t.length);
  const avgDocLen = docLengths.reduce((a, b) => a + b, 0) / Math.max(docs.length, 1) || 1;

  // Document frequency for each query term.
  const df = new Map<string, number>();
  for (const term of new Set(qTokens)) {
    let count = 0;
    for (const tokens of docTokens) {
      if (tokens.includes(term)) count++;
    }
    df.set(term, count);
  }

  return docs.map((doc, i) => {
    const tokens = docTokens[i];
    const dl = docLengths[i];
    let score = 0;
    for (const term of new Set(qTokens)) {
      const tf = tokens.filter((t) => t === term).length;
      if (tf === 0) continue;
      const n = df.get(term)!;
      // BM25 IDF with the +1 smoothing (Lucene-style) so terms appearing in
      // every doc still contribute a tiny positive weight rather than going
      // negative.
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (dl / avgDocLen));
      score += idf * (numerator / denominator);
    }
    return { id: doc.id, score };
  });
}
