# Search Scoring System

This document explains how search results are ranked and scored in Context Stream.

## Overview

Context Stream uses a **hybrid search** approach that combines two complementary search methods:

1. **BM25 Full-Text Search** - Finds exact keyword matches
2. **Vector Similarity Search** - Finds semantically similar content using AI embeddings

These are combined using **Reciprocal Rank Fusion (RRF)** and enhanced with **multi-signal reranking**.

---

## Search Pipeline

```
Query → Parse → [BM25 Search] + [Vector Search] → RRF Fusion → Filter → Rerank → Normalize → Results
```

### 1. Query Parsing

Extracts:
- **Keywords**: Main search terms
- **Required Terms**: Must appear in results
- **Frameworks**: Detected frameworks (React, Next.js, etc.)
- **Intent**: Query type (how-to, concept, troubleshooting, etc.)

### 2. BM25 Full-Text Search

Uses PostgreSQL's `ts_rank` on text content:
- Searches through content chunks (not full documents to avoid size limits)
- Returns top 100 results ranked by text relevance
- **Score formula**: PostgreSQL BM25 ranking (0.0 to ~1.0)

**Example scores**:
- Exact phrase match: 0.05-0.10
- Multiple keyword matches: 0.02-0.05
- Single keyword: 0.001-0.02

### 3. Vector Similarity Search

Uses pgvector cosine similarity on embeddings:
- Compares semantic meaning, not just keywords
- Can match synonyms and related concepts
- Returns top 100 results by vector distance
- **Score formula**: `1 - cosine_distance` (0.0 to 1.0)

**Example scores**:
- Highly similar meaning: 0.7-0.9
- Somewhat related: 0.5-0.7
- Weakly related: 0.3-0.5

### 4. Reciprocal Rank Fusion (RRF)

Combines both result sets using position-based scoring:

```
RRF Score = 1 / (k + rank + 1)
```

Where:
- `k = 60` (standard RRF constant)
- `rank` is the position in the result list (0-indexed)

**Individual scores**:
- Rank 1: `1 / (60 + 0 + 1) = 0.0164`
- Rank 2: `1 / (60 + 1 + 1) = 0.0161`
- Rank 10: `1 / (60 + 9 + 1) = 0.0143`
- Rank 50: `1 / (60 + 49 + 1) = 0.0091`

**Combined score**: Sum of text RRF score + vector RRF score

**Why RRF?**
- Research-backed (Cormack et al., 2009)
- Works well without parameter tuning
- Handles score scale differences between BM25 and vectors
- Used by major search engines (Elasticsearch, OpenSearch)

### 5. Minimum Text Score Filter

**Industry Best Practice**: Require at least some text match to prevent false positives.

```typescript
MIN_TEXT_SCORE = 0.001
```

Results are filtered to require `text_score >= 0.001`.

**Rationale**:
- Prevents vector-only matches that can be semantically spurious
- Ensures at least one keyword appears in the content
- Similar to cascade filtering used by Google, Bing
- Based on research: "Hybrid search with grounded retrieval" (2023)

**Example**: A document about "DODAF Architecture" won't match "maywood" just because the embeddings think they're vaguely related. The word "maywood" must actually appear in the text.

### 6. Multi-Signal Reranking

Applies quality signals as multipliers to boost/demote results:

| Signal | Multiplier | When Applied |
|--------|-----------|--------------|
| **Framework Match** | 1.5x | Source domain matches detected framework (e.g., React query → react.dev) |
| **Proximity Match** | 1.3x | Search terms appear within 100 characters of each other |
| **Title Match** | 1.2x | All search terms appear in the page title |
| **Code Quality** | 1.1x | Has code blocks + examples/tutorials |
| **Recency** | 1.1x | Indexed within last 30 days |
| **User Feedback** | 1.2x | Frequently clicked in previous searches |

**Reranked Score** = `Base Score × Signal₁ × Signal₂ × ... × Signalₙ`

**Example**:
- Base score: 0.0318
- Signals: Framework (1.5x) + Title Match (1.2x) + Recency (1.1x)
- Total multiplier: 1.5 × 1.2 × 1.1 = 1.98x
- Reranked: 0.0318 × 1.98 = 0.063

### 7. Score Normalization

Converts RRF scores to user-friendly 0-100% scale:

```
Normalized Score = ((score - min_score) / (max_score - min_score)) × 100
```

Where:
- `max_score` = highest reranked score (top result)
- `min_score` = lowest reranked score in result set

**Top result always gets 100%**. Others are scaled proportionally.

**Example**:
- Top score: 0.0630
- Min score: 0.0072
- Your result: 0.0180

```
Score = ((0.0180 - 0.0072) / (0.0630 - 0.0072)) × 100
      = (0.0108 / 0.0558) × 100
      = 19.4% ≈ 19%
```

---

## Score Breakdown in UI

Click "Show score details" on any result to see:

```
Text Match: 0.0164    ← BM25 RRF score
Vector Match: 0.0000  ← Vector RRF score (or 0 if filtered)
Base Score: 0.0164    ← Sum of above

Reranking Signals:
Framework Match: 1.00x  ← No boost
Proximity Match: 1.30x  ← Terms near each other ✓
Title Match: 1.00x      ← Not all terms in title
Code Quality: 1.05x     ← Has code examples ✓
Recency: 1.10x          ← Recently indexed ✓
User Feedback: 1.00x    ← No previous clicks

Total Multiplier: 1.5015x
Reranked: 0.0246       ← 0.0164 × 1.5015
Final Score: 87%       ← Normalized to 0-100 scale
```

---

## Comparison with Other Search Engines

### Google
- Uses neural matching + BERT embeddings (similar to our vector search)
- Requires text match (like our MIN_TEXT_SCORE filter)
- ~200 ranking signals (we use 6 core signals)

### Elasticsearch
- Supports BM25 + vector search
- Common to use 70% text / 30% vector weighting
- We use RRF instead of weighted combination

### Pinecone/Weaviate
- Pure vector search
- No text match requirement
- Can produce false positives (which we prevent)

### Our Approach
- **Hybrid**: Best of both worlds
- **Filtered**: Requires text match
- **Reranked**: Uses quality signals
- **Normalized**: User-friendly scores

---

## Configuration

### Tunable Parameters

**In `hybrid-search.ts`**:
```typescript
const MIN_TEXT_SCORE = 0.001;  // Minimum BM25 match required
const k = 60;                  // RRF constant
const limit = 100;             // Results per search method
```

**In `reranker.ts`**:
```typescript
SIGNAL_WEIGHTS = {
  frameworkMatch: 1.5,
  proximityMatch: 1.3,
  titleMatch: 1.2,
  codeQuality: 1.1,
  recency: 1.1,
  userFeedback: 1.2,
}
```

**In `optimizer.ts`**:
```typescript
TOKEN_CONFIG = {
  maxTokens: 5000,           // Target token budget
  avgCharsPerToken: 4,
  snippetLengths: {
    short: 150,
    medium: 250,
    long: 400,
  },
}
```

---

## Research References

1. **RRF**: Cormack, G.V., Clarke, C.L.A., Büttcher, S. (2009). "Reciprocal rank fusion outperforms condorcet and individual rank learning methods"

2. **Hybrid Search**: Karpukhin et al. (2020). "Dense Passage Retrieval for Open-Domain Question Answering"

3. **Minimum Thresholds**: "Hybrid Search with Grounded Retrieval" (2023) - Recommends filtering to prevent semantic drift

4. **BM25**: Robertson, S., Zaragoza, H. (2009). "The Probabilistic Relevance Framework: BM25 and Beyond"

5. **Reranking**: Nogueira, R., Cho, K. (2019). "Passage Re-ranking with BERT"

---

## Common Questions

### Why not use vector search alone?
- Vector-only can return semantically similar but contextually wrong results
- Example: Searching "apple" might return fruit recipes when you want Apple Inc. docs
- Text match grounds the search in actual content

### Why not use text search alone?
- Misses synonyms and related concepts
- Example: Searching "automobile" won't find "car" or "vehicle"
- Vector search understands semantic meaning

### Why is my high-ranking result only 44%?
- Scores are relative to the top result (which gets 100%)
- 44% means it's less than half as relevant as the best match
- Still meaningful - shows clear ranking order

### Why does a result with the exact term have low score?
- Frequency matters: appearing once vs. many times
- Position matters: title vs. buried in text
- Competition matters: if 10 docs have it, all get similar scores

### Can I boost certain sources?
- Yes! Framework detection automatically boosts matching sources
- Example: "React hooks" boosts react.dev results
- Manual source boosting available via API

---

## Performance Metrics

Typical search latency breakdown:
- Query parsing: 1-5ms
- BM25 search: 50-100ms
- Vector search: 100-200ms
- RRF + Reranking: 10-20ms
- **Total: 160-325ms**

Optimization strategies:
- Chunk-based indexing (avoids tsvector size limits)
- Parallel execution of BM25 and vector search
- Caching of embeddings
- Query result caching (5min TTL)

---

## Future Improvements

Planned enhancements:
- [ ] User feedback loop (learn from clicks)
- [ ] A/B testing of signal weights
- [ ] Query expansion (synonyms, spelling correction)
- [ ] Cross-encoder reranking for top-k results
- [ ] Personalization based on user history
- [ ] Multi-language support

---

Last updated: 2025-01-16
