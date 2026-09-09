import assert from 'node:assert/strict';
import { createQuotePicker } from '../.vitepress/theme/quote-shuffle.mjs';

for (const count of [1, 2, 30]) {
  let seed = 13;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = createQuotePicker(count, random);
  let previous = -1;
  for (let round = 0; round < 100; round++) {
    const seen = new Set();
    for (let i = 0; i < count; i++) {
      const index = pick();
      assert(index >= 0 && index < count);
      if (count > 1) assert.notEqual(index, previous);
      seen.add(index);
      previous = index;
    }
    assert.equal(seen.size, count);
  }
}
assert.equal(createQuotePicker(0)(), -1);
assert.notEqual(createQuotePicker(30, () => 0.99)(), createQuotePicker(30, () => 0)());
console.log('Quote shuffle tests passed: full rounds, no adjacent repeats, random first quote, empty/single lists.');
