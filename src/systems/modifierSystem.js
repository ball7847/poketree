import { D } from "../core/numberSystem.js";

export function createModifierBucket() {
  return { additive: 0, multiplicative: [] };
}

export function applyModifiers(baseValue, bucket) {
  let result = D(baseValue).times(1 + (bucket?.additive ?? 0));
  for (const multiplier of bucket?.multiplicative ?? []) {
    result = result.times(multiplier);
  }
  return result;
}
