import { parseOpenFoodFactsProduct } from '../utils/open-food-facts.js'
import { quantityKind } from '../utils/quantity-units.js'

const barcodeCache = new Map()

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
function fail(message, status = 400) {
  return json({ error: message }, status);
}
function userId(request) {
  return request.headers.get("oai-authenticated-user-id") || "owner";
}
function numeric(x, min = 0, max = 100000) {
  const n = Number(x);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
function cleanName(x) {
  return typeof x === "string" ? x.trim().slice(0, 120) : "";
}
async function one(db, sql, ...params) {
  return db
    .prepare(sql)
    .bind(...params)
    .first();
}
async function all(db, sql, ...params) {
  return (
    (
      await db
        .prepare(sql)
        .bind(...params)
        .all()
    ).results || []
  );
}
async function bodyOf(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
function dateValid(d) {
  return (
    typeof d === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !Number.isNaN(Date.parse(d + "T12:00:00Z"))
  );
}
async function api(request, env, url) {
  const db = env.DB;
  if (!db) return fail("Stockage indisponible. Réessaie plus tard.", 503);
  const owner = userId(request),
    method = request.method,
    parts = url.pathname.split("/").filter(Boolean).slice(1);
  try {
    if (method === "GET" && parts[0] === "barcode" && parts.length === 1) {
      const code = url.searchParams.get("code") || "";
      if (!/^\d{8,14}$/.test(code)) return fail("Saisis un code-barres de 8 à 14 chiffres.");
      const cached = barcodeCache.get(code);
      if (cached && cached.until > Date.now()) return json(cached.data);
      const upstream = await fetch(`https://world.openfoodfacts.org/api/v3/product/${code}?fields=code,product_name,brands,quantity,product_quantity,product_quantity_unit,nutriments`, {
        headers: { "User-Agent": "Miametrie/1.0 (https://github.com/G-eraldo/suivi-calories)", "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (upstream.status === 404) return fail("Produit absent d’Open Food Facts. Utilise la photo de l’étiquette ou la saisie manuelle.", 404);
      if (!upstream.ok) return fail("Open Food Facts est momentanément indisponible. Réessaie ou saisis l’étiquette.", 503);
      const result = await upstream.json();
      const product = parseOpenFoodFactsProduct(result.product, code);
      if (!product || !product.name) return fail("Fiche incomplète. Utilise la photo de l’étiquette ou la saisie manuelle.", 404);
      const data = { product };
      if (barcodeCache.size >= 100) barcodeCache.delete(barcodeCache.keys().next().value);
      barcodeCache.set(code, { data, until: Date.now() + 60 * 60 * 1000 });
      return json(data);
    }
    if (method === "GET" && parts[0] === "state") {
      const day = dateValid(url.searchParams.get("date"))
        ? url.searchParams.get("date")
        : new Date().toISOString().slice(0, 10);
      const [settings, products, recipes, meals] = await Promise.all([
        one(db, "SELECT goal_kcal FROM settings WHERE owner_id = ?", owner),
        all(
          db,
          "SELECT id,name,brand,kcal,protein,carbs,fat,fiber,basis_unit FROM products WHERE owner_id = ? ORDER BY name LIMIT 500",
          owner,
        ),
        all(
          db,
          "SELECT id,name,portions,ingredients_json,kcal,protein,carbs,fat,fiber FROM recipes WHERE owner_id = ? ORDER BY name LIMIT 500",
          owner,
        ),
        all(
          db,
          "SELECT id,item_id,item_name,item_type,meal_type,quantity,basis_unit,kcal,protein,carbs,fat,fiber FROM meals WHERE owner_id = ? AND eaten_on = ? ORDER BY created_at DESC LIMIT 500",
          owner,
          day,
        ),
      ]);
      return json({
        goal: settings?.goal_kcal || 2000,
        products,
        recipes: recipes.map(({ ingredients_json, ...recipe }) => {
          try {
            const saved = JSON.parse(ingredients_json);
            return {
              ...recipe,
              ingredients: Array.isArray(saved)
                ? saved
                : saved.ingredients || [],
              instructions: Array.isArray(saved)
                ? ""
                : saved.instructions || "",
            };
          } catch {
            return { ...recipe, ingredients: [], instructions: "" };
          }
        }),
        meals,
      });
    }
    if (method === "GET" && parts[0] === "recent-meals") {
      const rows = await all(db,
        "SELECT id,item_type,item_id,item_name,meal_type,quantity,basis_unit,kcal,protein,carbs,fat,fiber,eaten_on FROM meals WHERE owner_id = ? ORDER BY eaten_on DESC, created_at DESC LIMIT 150",
        owner,
      );
      const suggestions = new Map();
      for (const row of rows) {
        const key = `${row.item_type}:${row.item_id}:${row.quantity}:${row.meal_type}`;
        const existing = suggestions.get(key);
        if (existing) existing.count++;
        else suggestions.set(key, { ...row, count: 1 });
      }
      return json({ recent: [...suggestions.values()].slice(0, 8), frequent: [...suggestions.values()].sort((a, b) => b.count - a.count).slice(0, 8) });
    }
    if (method === "GET" && parts[0] === "trends") {
      const end = url.searchParams.get("end");
      const days = Number(url.searchParams.get("days"));
      if (!dateValid(end) || ![7, 30].includes(days)) return fail("Période invalide.");
      const start = new Date(`${end}T12:00:00Z`);
      start.setUTCDate(start.getUTCDate() - days + 1);
      const rows = await all(db,
        "SELECT eaten_on,COUNT(*) AS meals,SUM(kcal) AS kcal,SUM(protein) AS protein,SUM(carbs) AS carbs,SUM(fat) AS fat,SUM(fiber) AS fiber,COUNT(fiber) AS fiber_known FROM meals WHERE owner_id = ? AND eaten_on >= ? AND eaten_on <= ? GROUP BY eaten_on ORDER BY eaten_on",
        owner, start.toISOString().slice(0, 10), end,
      );
      return json({ start: start.toISOString().slice(0, 10), end, days, rows });
    }
    if (method === "POST" && parts[0] === "goal") {
      const b = await bodyOf(request),
        goal = numeric(b?.goal, 500, 10000);
      if (goal === null || !Number.isInteger(goal))
        return fail("Indique un objectif entre 500 et 10 000 kcal.");
      await db
        .prepare(
          "INSERT INTO settings (owner_id,goal_kcal) VALUES (?,?) ON CONFLICT(owner_id) DO UPDATE SET goal_kcal=excluded.goal_kcal",
        )
        .bind(owner, goal)
        .run();
      return json({ ok: true });
    }
    if (method === "POST" && parts[0] === "products") {
      const b = await bodyOf(request),
        name = cleanName(b?.name),
        brand = cleanName(b?.brand);
      const values = ["kcal", "protein", "carbs", "fat"].map((k) =>
        numeric(b?.[k], 0, 10000),
      );
      const fiber = b?.fiber === undefined || b?.fiber === null || b?.fiber === ""
        ? null : numeric(b.fiber, 0, 100);
      const basisUnit = quantityKind(name) === 'liquid' ? (b?.basisUnit || 'ml') : 'g';
      if (!name || values.some((x) => x === null))
        return fail("Complète le nom et les valeurs nutritionnelles.");
      if (!['g', 'ml'].includes(basisUnit)) return fail("Choisis une unité nutritionnelle valide.");
      if (fiber === null && b?.fiber !== undefined && b?.fiber !== null && b?.fiber !== "")
        return fail("Vérifie la quantité de fibres pour 100 g ou 100 ml.");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO products (id,owner_id,name,brand,kcal,protein,carbs,fat,fiber,basis_unit,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(id, owner, name, brand, ...values, fiber, basisUnit, new Date().toISOString())
        .run();
      return json({ id }, 201);
    }
    if (method === "PATCH" && parts[0] === "products" && parts[1]) {
      const b = await bodyOf(request);
      const fiber = b?.fiber === null || b?.fiber === "" ? null : numeric(b?.fiber, 0, 100);
      if (fiber === null && b?.fiber !== undefined && b?.fiber !== null && b?.fiber !== "")
        return fail("Vérifie la quantité de fibres pour 100 g ou 100 ml.");
      const product = await one(db, "SELECT id,name,fiber,basis_unit FROM products WHERE id = ? AND owner_id = ?", parts[1], owner);
      if (!product) return fail("Ce produit est introuvable.", 404);
      const basisUnit = quantityKind(product.name) === 'liquid' ? (b?.basisUnit || product.basis_unit) : 'g';
      if (!['g', 'ml'].includes(basisUnit)) return fail("Choisis une unité nutritionnelle valide.");
      await db.prepare("UPDATE products SET fiber = ?,basis_unit = ? WHERE id = ? AND owner_id = ?")
        .bind(b?.fiber === undefined ? product.fiber : fiber, basisUnit, parts[1], owner).run();
      return json({ ok: true });
    }
    if (parts[0] === "recipes" && ((method === "POST" && parts.length === 1) || (method === "PATCH" && parts.length === 2))) {
      const updating = method === "PATCH";
      if (updating && !await one(db, "SELECT id FROM recipes WHERE id = ? AND owner_id = ?", parts[1], owner))
        return fail("Cette recette est introuvable.", 404);
      const b = await bodyOf(request),
        name = cleanName(b?.name),
        portions = numeric(b?.portions, 1, 100);
      const ingredients = b?.ingredients,
        instructions =
          typeof b?.instructions === "string"
            ? b.instructions.trim().slice(0, 10000)
            : "";
      if (
        !name ||
        !Number.isInteger(portions) ||
        !Array.isArray(ingredients) ||
        !ingredients.length ||
        ingredients.length > 50
      )
        return fail("Complète le nom, les portions et les ingrédients.");
      const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        fibers = [],
        saved = [];
      for (const line of ingredients) {
        const grams = numeric(line?.grams, 0.1, 100000);
        if (!grams)
          return fail("Vérifie les quantités des ingrédients.");
        if (line?.excluded === true) {
          const label = cleanName(line.label);
          if (!label) return fail("Nomme les ingrédients non comptabilisés.");
          saved.push({ productId: null, name: label, grams, excluded: true });
          continue;
        }
        if (typeof line.productId !== "string" || !line.productId)
          return fail("Choisis un produit ou coche « Ne pas comptabiliser » pour chaque ingrédient.");
        const p = await one(
          db,
          "SELECT id,name,kcal,protein,carbs,fat,fiber,basis_unit FROM products WHERE id = ? AND owner_id = ?",
          line.productId,
          owner,
        );
        if (!p) return fail("Un produit de la recette est introuvable.");
        const liquid = quantityKind(p.name) === 'liquid';
        const basisUnit = liquid ? (line.basisUnit || p.basis_unit) : 'g';
        if (!['g', 'ml'].includes(basisUnit)) return fail("Choisis g ou cl pour cet ingrédient liquide.");
        // `grams` is the product's base quantity: grams for 100 g labels,
        // milliliters for 100 ml labels. The client converts cl to ml.
        // A liquid ingredient can explicitly override the product's label base.
        for (const key of Object.keys(totals))
          totals[key] += (p[key] * grams) / 100;
        fibers.push(p.fiber == null ? null : (p.fiber * grams) / 100);
        saved.push({ productId: p.id, name: p.name, grams, basisUnit, unitOverride: liquid && basisUnit !== p.basis_unit });
      }
      if (saved.every((line) => line.excluded))
        return fail("Sélectionne au moins un produit comptabilisé pour la recette.");
      const values = Object.values(totals).map(x => Math.round(x / portions * 10) / 10);
      const fiber = fibers.some(value => value === null) ? null : Math.round(fibers.reduce((sum, value) => sum + value, 0) / portions * 10) / 10;
      const ingredientsJson = JSON.stringify({ ingredients: saved, instructions });
      if (updating) {
        await db.prepare("UPDATE recipes SET name = ?,portions = ?,ingredients_json = ?,kcal = ?,protein = ?,carbs = ?,fat = ?,fiber = ? WHERE id = ? AND owner_id = ?")
          .bind(name, portions, ingredientsJson, ...values, fiber, parts[1], owner).run();
        return json({ id: parts[1] });
      }
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO recipes (id,owner_id,name,portions,ingredients_json,kcal,protein,carbs,fat,fiber,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          owner,
          name,
          portions,
          ingredientsJson,
          ...values,
          fiber,
          new Date().toISOString(),
        )
        .run();
      return json({ id }, 201);
    }
    if (method === "POST" && parts[0] === "meals" && parts.length === 1) {
      const b = await bodyOf(request),
        quantity = numeric(b?.quantity, 0.1, 100000);
      if (
        !dateValid(b?.date) ||
        !["Petit-déjeuner", "Déjeuner", "Dîner", "Collation"].includes(
          b?.mealType,
        ) ||
        !["product", "recipe"].includes(b?.itemType) ||
        !quantity ||
        typeof b.itemId !== "string"
      )
        return fail("Vérifie les informations du repas.");
      const table = b.itemType === "product" ? "products" : "recipes";
      const item = await one(
        db,
        `SELECT id,name,kcal,protein,carbs,fat,fiber${b.itemType === 'product' ? ',basis_unit' : ''} FROM ${table} WHERE id = ? AND owner_id = ?`,
        b.itemId,
        owner,
      );
      if (!item) return fail("Ce produit ou cette recette est introuvable.");
      // Product quantities use grams or milliliters according to the label base.
      const factor = b.itemType === "product" ? quantity / 100 : quantity;
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO meals (id,owner_id,eaten_on,meal_type,item_type,item_id,item_name,quantity,basis_unit,kcal,protein,carbs,fat,fiber,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          owner,
          b.date,
          b.mealType,
          b.itemType,
          item.id,
          item.name,
          quantity,
          b.itemType === 'product' ? item.basis_unit : null,
          ...["kcal", "protein", "carbs", "fat"].map(
            (k) => Math.round(item[k] * factor * 10) / 10,
          ),
          item.fiber == null ? null : Math.round(item.fiber * factor * 10) / 10,
          new Date().toISOString(),
        )
        .run();
      return json({ id }, 201);
    }
    if (parts[0] === "meals" && parts[1] && ["PATCH", "POST"].includes(method)) {
      const duplicate = method === "POST" && parts[2] === "duplicate";
      if (!duplicate && (method !== "PATCH" || parts.length !== 2)) return fail("Action introuvable.", 404);
      const original = await one(db,
        "SELECT id,item_type,item_id,item_name,meal_type,quantity,basis_unit,kcal,protein,carbs,fat,fiber FROM meals WHERE id = ? AND owner_id = ?",
        parts[1], owner,
      );
      if (!original) return fail("Ce repas est introuvable.", 404);
      const b = await bodyOf(request);
      const quantity = duplicate ? original.quantity : numeric(b?.quantity, 0.1, 100000);
      if (!dateValid(b?.date) || !["Petit-déjeuner", "Déjeuner", "Dîner", "Collation"].includes(b?.mealType) || !quantity)
        return fail("Vérifie la date, le moment et la quantité du repas.");
      if (duplicate) {
        const id = crypto.randomUUID();
        await db.prepare("INSERT INTO meals (id,owner_id,eaten_on,meal_type,item_type,item_id,item_name,quantity,basis_unit,kcal,protein,carbs,fat,fiber,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(id, owner, b.date, b.mealType, original.item_type, original.item_id, original.item_name, original.quantity, original.basis_unit ?? null, original.kcal, original.protein, original.carbs, original.fat, original.fiber, new Date().toISOString()).run();
        return json({ id }, 201);
      }
      const factor = quantity / original.quantity;
      const values = ["kcal", "protein", "carbs", "fat"].map(key => Math.round(original[key] * factor * 10000) / 10000);
      const fiber = original.fiber == null ? null : Math.round(original.fiber * factor * 10000) / 10000;
      await db.prepare("UPDATE meals SET eaten_on = ?,meal_type = ?,quantity = ?,kcal = ?,protein = ?,carbs = ?,fat = ?,fiber = ? WHERE id = ? AND owner_id = ?")
        .bind(b.date, b.mealType, quantity, ...values, fiber, parts[1], owner).run();
      return json({ ok: true });
    }
    if (
      method === "DELETE" &&
      ["products", "recipes", "meals"].includes(parts[0]) &&
      parts[1]
    ) {
      const id = parts[1],
        table = parts[0];
      await db
        .prepare(`DELETE FROM ${table} WHERE id = ? AND owner_id = ?`)
        .bind(id, owner)
        .run();
      return json({ ok: true });
    }
    return fail("Action introuvable.", 404);
  } catch (e) {
    console.error("API error", e);
    return fail("Le service est momentanément indisponible. Réessaie.", 503);
  }
}
const mime = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  ico: "image/x-icon",
  woff2: "font/woff2",
  json: "application/json; charset=utf-8",
};
function base64Bytes(s) {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
export function createHandler(assets) {
  const decodedAssets = Object.fromEntries(
    Object.entries(assets).map(([path, content]) => [path, base64Bytes(content)]),
  );
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return api(request, env, url);
      const path =
        decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
      const key = Object.hasOwn(decodedAssets, path) ? path : "index.html";
      const ext = key.split(".").pop().toLowerCase();
      return new Response(decodedAssets[key], {
        headers: {
          "Content-Type": mime[ext] || "application/octet-stream",
          "Cache-Control":
            key.startsWith("_nuxt/") && /(?:\/|[._])[\w-]{8,}\.(js|css)$/.test(key)
              ? "public, max-age=31536000, immutable"
              : "no-cache",
        },
      });
    },
  };
}
