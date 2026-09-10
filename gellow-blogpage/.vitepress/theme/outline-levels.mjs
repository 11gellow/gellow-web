export function outlineLevels(value) {
  if (value === false) return [];
  if (value === 'deep') return [2, 3, 4, 5, 6];
  const valid = n => Number.isInteger(n) && n >= 1 && n <= 6;
  if (valid(value)) return [value];
  if (Array.isArray(value) && value.length >= 2 && value.every(valid)) {
    const start = value[0], end = value[value.length - 1];
    if (start <= end) return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
  return [2, 3];
}
