import { shuffledBag } from './shuffle.mjs';

// Every round contains every index; avoid repeating across round boundaries.
export function createQuotePicker(count, random = Math.random) {
  let bag = [];
  let previous = -1;
  return () => {
    if (count < 1) return -1;
    if (!bag.length) {
      bag = shuffledBag(count, -1, random);
      if (count > 1 && bag[bag.length - 1] === previous) {
        const other = Math.floor(random() * (count - 1));
        [bag[other], bag[bag.length - 1]] = [bag[bag.length - 1], bag[other]];
      }
    }
    previous = bag.pop();
    return previous;
  };
}
