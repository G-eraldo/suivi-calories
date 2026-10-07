// Values supplied from the Adélie vanilla nougatine cone packaging: 6 cones, 411 g.
export const adelieCone = {
  name: "Glace cône vanille nougatine",
  brand: "Adélie",
  grams: 411 / 6,
  kcal: 284,
  protein: 2.8,
  carbs: 36,
  fat: 14,
};

export function gramsForCones(count) {
  return count * adelieCone.grams;
}

export function conesForGrams(grams) {
  const count = Number(grams) / adelieCone.grams;
  return Number.isInteger(count) && count > 0 ? count : null;
}
