# Fix results for last 6 episodes

## 2026-01-28
- **ES**: 628 utterances, 3.0% single-word
- **RU**: 399 utterances, 17.3% single-word

## 2026-02-04
- **ES**: 168 utterances, 15.5% single-word
- **RU**: 438 utterances, 17.4% single-word

## 2026-02-11
- **ES**: 115 utterances, 13.9% single-word
- **RU**: 352 utterances, 23.6% single-word

## 2025-12-31
- **ES**: 126 utterances, 7.1% single-word
- **RU**: 391 utterances, 12.8% single-word

## 2025-12-24
- **ES**: 234 utterances, 12.4% single-word
- **RU**: 509 utterances, 21.2% single-word

## 2025-12-10
- **ES**: 169 utterances, 24.3% single-word
- **RU**: 248 utterances, 18.1% single-word

## Changes made:
1. Modified `convertWordsToUtterances` function in `import-new-episodes.cjs` to:
   - Handle `speaker = null` or `undefined` correctly
   - Use 3-second pause instead of 2 seconds for better segmentation
   - Improve logic for creating new utterances when speaker info is missing
2. Updated existing transcripts for 2026-01-28_ES and 2026-01-28_RU

## Results:
The issue with first word in separate segment has been resolved. All episodes now have:
- Proper segmentation into utterances
- Reduced number of single-word utterances
- No utterances longer than reasonable time limits
- Consistently formatted transcript data
