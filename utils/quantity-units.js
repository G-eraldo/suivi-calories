const normalize = (value) =>
  String(value || "")
    .replace(/œ/gi, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

// The persisted `grams` field holds the chosen base amount: grams or milliliters.
// A liquid quantity in cl is converted to ml before it is stored.

export function quantityKind(name) {
  const label = normalize(name);
  if (/^oeufs?\b/.test(label)) return "egg";
  if (
    /^(?:eau|laits?|huiles?|jus|boissons?|sirops?|bouillons?|cremes? liquides?)\b/.test(
      label,
    )
  )
    return "liquid";
  return "solid";
}

export function productQuantityKind(product) {
  const kind = quantityKind(product?.name);
  return kind === "liquid" && product?.basis_unit === "g" ? "solid" : kind;
}

export function quantityFromGrams(grams, kind) {
  const divisor = kind === "egg" ? 50 : kind === "liquid" ? 10 : 1;
  return Math.round((Number(grams) / divisor) * 100) / 100;
}

export function gramsFromQuantity(quantity, kind) {
  const multiplier = kind === "egg" ? 50 : kind === "liquid" ? 10 : 1;
  return Number(quantity) * multiplier;
}

export function quantityText(grams, name, basisUnit) {
  const kind = productQuantityKind({ name, basis_unit: basisUnit });
  const amount = quantityFromGrams(grams, kind);
  if (kind === "egg") return `${amount} ${amount > 1 ? "œufs" : "œuf"}`;
  return `${amount} ${kind === "liquid" ? "cl" : "g"}`;
}
