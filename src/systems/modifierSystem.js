export function createModifierBucket() {
  return {
    additive: 0,
    multiplicative: [],
  };
}

export function applyModifiers(baseValue, bucket) {
  const additiveMultiplier = 1 + (bucket?.additive ?? 0);
  const multiplicativeMultiplier = (bucket?.multiplicative ?? []).reduce(
    (result, multiplier) => result * multiplier,
    1,
  );

  return baseValue * additiveMultiplier * multiplicativeMultiplier;
}
