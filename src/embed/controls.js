export function touchKeys(game) {
  const controls = game.controls || '';
  const inferred = [[' ', /\bspace\b/i], ['x', /\bX\b/], ['z', /\bZ\b/], ['c', /\bC\b/], ['b', /\bB\b/], ['Enter', /\bEnter\b/i], ['Shift', /\bShift\b/i]].filter(([, pattern]) => pattern.test(controls)).map(([key]) => key);
  const declared = Array.isArray(game.touchKeys) ? game.touchKeys : inferred;
  return [...new Set(declared.filter(key => typeof key === 'string' && (key === ' ' || key === 'Enter' || key === 'Shift' || (key.length === 1 && /\S/.test(key)))))];
}
