export function shuffledBag(count, exclude, random = Math.random) {
  const bag = Array.from({ length: count }, (_, i) => i).filter(i => i !== exclude);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
