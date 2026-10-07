// USDA FoodData Central, SR Legacy. Values per 100 g of edible raw food.
// Unit weights are common edible portions; weigh the food for a more precise entry.
// USDA carbohydrates are measured by difference and include fiber.
export const commonFoods = [
  {
    id: "egg",
    name: "Œuf entier (cru)",
    brand: "",
    singular: "œuf",
    plural: "œufs",
    grams: 50,
    kcal: 143,
    protein: 12.56,
    carbs: 0.72,
    fat: 9.51,
    fdcId: 171287,
  },
  {
    id: "banana",
    name: "Banane",
    brand: "",
    singular: "banane",
    plural: "bananes",
    grams: 118,
    kcal: 89,
    protein: 1.09,
    carbs: 22.84,
    fat: 0.33,
    fdcId: 173944,
  },
  {
    id: "apple",
    name: "Pomme",
    brand: "",
    singular: "pomme",
    plural: "pommes",
    grams: 182,
    kcal: 52,
    protein: 0.26,
    carbs: 13.81,
    fat: 0.17,
    fdcId: 171688,
  },
];

export function commonFoodForIngredient(label) {
  const name = String(label || "")
    .replace(/œ/gi, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (/^oeufs?$/.test(name)) return commonFoods[0];
  if (/^bananes?$/.test(name)) return commonFoods[1];
  if (/^pommes?$/.test(name)) return commonFoods[2];
  return null;
}

export function unitsForGrams(food, grams) {
  const units = Number(grams) / food.grams;
  return Number.isInteger(units) && units > 0 ? units : null;
}
