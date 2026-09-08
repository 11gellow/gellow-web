import assert from 'node:assert/strict';
import { shuffledBag } from '../.vitepress/theme/shuffle.mjs';
for (let count = 1; count <= 30; count++) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const first = attempt % count;
    const initial = [first, ...shuffledBag(count, first)];
    assert.equal(new Set(initial).size, count);
    let last = initial.at(-1);
    for (let round = 0; round < 10; round++) {
      const bag = shuffledBag(count, -1);
      if (bag.length > 1 && bag[0] === last) [bag[0], bag[1]] = [bag[1], bag[0]];
      assert.equal(bag.length, count);
      assert.equal(new Set(bag).size, count);
      if (count > 1) assert.notEqual(bag[0], last);
      last = bag.at(-1);
    }
  }
}
console.log('Shuffle: initial coverage, complete rounds and boundary non-repetition passed.');
