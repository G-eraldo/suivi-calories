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
    if (method === "GET" && parts[0] === "state") {
      const day = dateValid(url.searchParams.get("date"))
        ? url.searchParams.get("date")
        : new Date().toISOString().slice(0, 10);
      const [settings, products, recipes, meals] = await Promise.all([
        one(db, "SELECT goal_kcal FROM settings WHERE owner_id = ?", owner),
        all(
          db,
          "SELECT id,name,brand,kcal,protein,carbs,fat FROM products WHERE owner_id = ? ORDER BY name LIMIT 500",
          owner,
        ),
        all(
          db,
          "SELECT id,name,portions,ingredients_json,kcal,protein,carbs,fat FROM recipes WHERE owner_id = ? ORDER BY name LIMIT 500",
          owner,
        ),
        all(
          db,
          "SELECT id,item_name,item_type,meal_type,quantity,kcal,protein,carbs,fat FROM meals WHERE owner_id = ? AND eaten_on = ? ORDER BY created_at DESC LIMIT 500",
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
      if (!name || values.some((x) => x === null))
        return fail("Complète le nom et les valeurs nutritionnelles.");
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO products (id,owner_id,name,brand,kcal,protein,carbs,fat,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        )
        .bind(id, owner, name, brand, ...values, new Date().toISOString())
        .run();
      return json({ id }, 201);
    }
    if (method === "POST" && parts[0] === "recipes") {
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
        saved = [];
      for (const line of ingredients) {
        const grams = numeric(line?.grams, 0.1, 100000);
        if (!grams || typeof line.productId !== "string")
          return fail("Vérifie les quantités des ingrédients.");
        const p = await one(
          db,
          "SELECT id,name,kcal,protein,carbs,fat FROM products WHERE id = ? AND owner_id = ?",
          line.productId,
          owner,
        );
        if (!p) return fail("Un produit de la recette est introuvable.");
        for (const key of Object.keys(totals))
          totals[key] += (p[key] * grams) / 100;
        saved.push({ productId: p.id, name: p.name, grams });
      }
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO recipes (id,owner_id,name,portions,ingredients_json,kcal,protein,carbs,fat,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          owner,
          name,
          portions,
          JSON.stringify({ ingredients: saved, instructions }),
          ...Object.values(totals).map(
            (x) => Math.round((x / portions) * 10) / 10,
          ),
          new Date().toISOString(),
        )
        .run();
      return json({ id }, 201);
    }
    if (method === "POST" && parts[0] === "meals") {
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
        `SELECT id,name,kcal,protein,carbs,fat FROM ${table} WHERE id = ? AND owner_id = ?`,
        b.itemId,
        owner,
      );
      if (!item) return fail("Ce produit ou cette recette est introuvable.");
      const factor = b.itemType === "product" ? quantity / 100 : quantity;
      const id = crypto.randomUUID();
      await db
        .prepare(
          "INSERT INTO meals (id,owner_id,eaten_on,meal_type,item_type,item_id,item_name,quantity,kcal,protein,carbs,fat,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
          ...["kcal", "protein", "carbs", "fat"].map(
            (k) => Math.round(item[k] * factor * 10) / 10,
          ),
          new Date().toISOString(),
        )
        .run();
      return json({ id }, 201);
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
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return api(request, env, url);
      const path =
        decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
      const key = Object.hasOwn(assets, path) ? path : "index.html";
      const ext = key.split(".").pop().toLowerCase();
      return new Response(base64Bytes(assets[key]), {
        headers: {
          "Content-Type": mime[ext] || "application/octet-stream",
          "Cache-Control":
            key === "index.html"
              ? "no-cache"
              : "public, max-age=31536000, immutable",
        },
      });
    },
  };
}
