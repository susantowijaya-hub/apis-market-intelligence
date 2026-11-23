import { NewsStory } from '../types/market';

export type HeadlinePolarity = 'bullish' | 'bearish' | 'neutral';

export type HeadlineSentimentRegime =
  | 'Strong Bullish'
  | 'Bullish'
  | 'Neutral'
  | 'Bearish'
  | 'Strong Bearish';

export interface ScoredHeadline {
  story: NewsStory;
  polarity: HeadlinePolarity;
  score: number; // clamped -1..+1
  matchedTerms: string[];
}

export interface HeadlineSentimentSummary {
  score: number; // 0..100 (50 = balanced)
  netBalance: number; // -100..+100
  regime: HeadlineSentimentRegime;
  direction: 'bull' | 'bear' | 'neutral';
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalCount: number;
  bullishPct: number;
  bearishPct: number;
  neutralPct: number;
  topBullTerms: string[];
  topBearTerms: string[];
  scoredHeadlines: ScoredHeadline[];
}

interface LexiconRule {
  pattern: RegExp;
  weight: number;
  term: string;
}

const BULLISH_RULES: LexiconRule[] = [
  { pattern: /\b(record high|all-time high|ath|breakout|outperform|rate cut|rate cuts|soft landing)\b/gi, weight: 2.0, term: 'rally catalyst' },
  { pattern: /\b(cooling inflation|inflation cools|inflation eases|disinflation|dovish|stimulus)\b/gi, weight: 1.9, term: 'easing policy' },
  { pattern: /\b(surges?|soars?|rallies|rallying|rally|jumps?|rebounds?|rebound|booms?)\b/gi, weight: 1.6, term: 'surge' },
  { pattern: /\b(beats?|topped|exceeds?|upgraded?|upgrades|bullish|optimis[mt]|upside)\b/gi, weight: 1.5, term: 'beats' },
  { pattern: /\b(gains?|climbs?|advances?|rises?|rising|strengthens?|stronger|recovers?|recovery)\b/gi, weight: 1.2, term: 'gains' },
  { pattern: /\b(inflows?|net buy|foreign buy|accumulation|accumulate|expansion|approv(ed|al))\b/gi, weight: 1.35, term: 'inflows' },
  { pattern: /\b(boosts?|boosted|resilient|growth|profit(s|ability)?|buyback|dividend hike)\b/gi, weight: 1.15, term: 'growth' },
];

const BEARISH_RULES: LexiconRule[] = [
  { pattern: /\b(crash(es|ed)?|plunges?|plunging|collapse[sd]?|crisis|default(s|ed)?|recession)\b/gi, weight: -2.1, term: 'selloff risk' },
  { pattern: /\b(inflation spike|hotter inflation|rate hike|rate hikes|hawkish|stagflation)\b/gi, weight: -1.85, term: 'tightening' },
  { pattern: /\b(sell-?offs?|slumps?|tumbles?|sinks?|plummet(s|ed)?|bearish|risk-off)\b/gi, weight: -1.65, term: 'selloff' },
  { pattern: /\b(misses?|missed|downgraded?|downgrades|warns?|warning|layoffs?|bankrupt(cy)?)\b/gi, weight: -1.5, term: 'downgrade' },
  { pattern: /\b(drops?|falls?|declines?|declining|retreats?|weakens?|weaker|losses?|downside)\b/gi, weight: -1.2, term: 'decline' },
  { pattern: /\b(outflows?|net sell|foreign sell|tariffs?|sanctions?|conflict|escalation|fear)\b/gi, weight: -1.35, term: 'outflows' },
  { pattern: /\b(pressure[ds]?|headwinds?|volatility spike|uncertainty|halt(s|ed)?|slashed|cuts forecast)\b/gi, weight: -1.15, term: 'headwind' },
];

const NEGATION_RE = /\b(not|no|never|less|without|easing|avoids?|avoiding|averted|unlikely|failed to)\s+$/i;

function evaluateTextScore(text: string): {
  rawScore: number;
  bullTerms: string[];
  bearTerms: string[];
} {
  let rawScore = 0;
  const bullTerms: string[] = [];
  const bearTerms: string[] = [];

  const scanRules = (rules: LexiconRule[], isBullRule: boolean) => {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.pattern.exec(text)) !== null) {
        const prefix = text.slice(Math.max(0, match.index - 22), match.index);
        const negated = NEGATION_RE.test(prefix);
        const effectiveWeight = negated ? -rule.weight * 0.7 : rule.weight;
        rawScore += effectiveWeight;
        const matchedLabel = match[0].toLowerCase();
        if (effectiveWeight > 0) {
          bullTerms.push(matchedLabel || rule.term);
        } else {
          bearTerms.push(matchedLabel || rule.term);
        }
        // Prevent double-counting identical phrase matches too aggressively
        if ((isBullRule && bullTerms.length >= 5) || (!isBullRule && bearTerms.length >= 5)) {
          break;
        }
      }
    }
  };

  scanRules(BULLISH_RULES, true);
  scanRules(BEARISH_RULES, false);

  return { rawScore, bullTerms, bearTerms };
}

export function analyzeHeadlineSentiment(stories: NewsStory[]): HeadlineSentimentSummary {
  if (!stories || stories.length === 0) {
    return {
      score: 50,
      netBalance: 0,
      regime: 'Neutral',
      direction: 'neutral',
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      totalCount: 0,
      bullishPct: 0,
      bearishPct: 0,
      neutralPct: 0,
      topBullTerms: [],
      topBearTerms: [],
      scoredHeadlines: [],
    };
  }

  const bullTermFreq = new Map<string, number>();
  const bearTermFreq = new Map<string, number>();

  let weightedSum = 0;
  let totalWeight = 0;
  let bullishCount = 0;
  let bearishCount = 0;
  let neutralCount = 0;

  const scoredHeadlines: ScoredHeadline[] = stories.map((story) => {
    const headlineEval = evaluateTextScore(story.headline || '');
    const summaryEval = evaluateTextScore(story.summary || '');
    const tagsText = Array.isArray(story.tags) ? story.tags.join(' ') : '';
    const tagsEval = evaluateTextScore(tagsText);

    let combined =
      headlineEval.rawScore * 1.45 +
      summaryEval.rawScore * 0.55 +
      tagsEval.rawScore * 0.35;

    if (typeof story.badgePositive === 'boolean') {
      combined += story.badgePositive ? 0.85 : -0.85;
    }

    // Smoothly squash to [-1, +1]
    const normalized = Math.tanh(combined / 2.2);
    const storyWeight = story.isBreaking ? 1.3 : 1.0;

    weightedSum += normalized * storyWeight;
    totalWeight += storyWeight;

    let polarity: HeadlinePolarity = 'neutral';
    if (normalized >= 0.16) {
      polarity = 'bullish';
      bullishCount += 1;
    } else if (normalized <= -0.16) {
      polarity = 'bearish';
      bearishCount += 1;
    } else {
      neutralCount += 1;
    }

    for (const t of [...headlineEval.bullTerms, ...summaryEval.bullTerms]) {
      bullTermFreq.set(t, (bullTermFreq.get(t) ?? 0) + 1);
    }
    for (const t of [...headlineEval.bearTerms, ...summaryEval.bearTerms]) {
      bearTermFreq.set(t, (bearTermFreq.get(t) ?? 0) + 1);
    }

    const matchedTerms = Array.from(
      new Set([
        ...(polarity === 'bearish'
          ? [...headlineEval.bearTerms, ...summaryEval.bearTerms]
          : [...headlineEval.bullTerms, ...summaryEval.bullTerms]),
        ...headlineEval.bullTerms,
        ...headlineEval.bearTerms,
      ])
    ).slice(0, 3);

    return {
      story,
      polarity,
      score: Number(normalized.toFixed(3)),
      matchedTerms,
    };
  });

  const avgPolarity = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const breadthBalance =
    stories.length > 0 ? (bullishCount - bearishCount) / stories.length : 0;
  const blended = Math.max(-1, Math.min(1, avgPolarity * 0.65 + breadthBalance * 0.35));

  const score = Math.max(0, Math.min(100, Math.round(50 + blended * 50)));
  const netBalance = Math.round(blended * 100);

  const regime: HeadlineSentimentRegime =
    score >= 70
      ? 'Strong Bullish'
      : score >= 56
        ? 'Bullish'
        : score <= 30
          ? 'Strong Bearish'
          : score <= 44
            ? 'Bearish'
            : 'Neutral';

  const direction: 'bull' | 'bear' | 'neutral' =
    score >= 56 ? 'bull' : score <= 44 ? 'bear' : 'neutral';

  const totalCount = stories.length;
  const bullishPct = Math.round((bullishCount / totalCount) * 100);
  const bearishPct = Math.round((bearishCount / totalCount) * 100);
  const neutralPct = Math.max(0, 100 - bullishPct - bearishPct);

  const topBullTerms = Array.from(bullTermFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
  const topBearTerms = Array.from(bearTermFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  // Sort most decisive headlines first for display
  const sortedHeadlines = [...scoredHeadlines].sort(
    (a, b) => Math.abs(b.score) - Math.abs(a.score)
  );

  return {
    score,
    netBalance,
    regime,
    direction,
    bullishCount,
    bearishCount,
    neutralCount,
    totalCount,
    bullishPct,
    bearishPct,
    neutralPct,
    topBullTerms,
    topBearTerms,
    scoredHeadlines: sortedHeadlines,
  };
}
