const tables = "settings|products|recipes|meals";

export function createD1Adapter(pool) {
  return {
    prepare(sql) {
      let position = 0;
      const query = sql
        .replace(/\?/g, () => `$${++position}`)
        .replace(
          new RegExp(`\\b(FROM|INTO|UPDATE)\\s+(${tables})\\b`, "gi"),
          (_, keyword, table) => `${keyword} miametrie.${table}`,
        );
      return {
        bind(...params) {
          return {
            async first() {
              return (await pool.query(query, params)).rows[0] || null;
            },
            async all() {
              return { results: (await pool.query(query, params)).rows };
            },
            async run() {
              return pool.query(query, params);
            },
          };
        },
      };
    },
  };
}
