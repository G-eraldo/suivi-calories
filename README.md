# Miamétrie

Suivi personnel des repas, produits et recettes. L'interface est construite avec Nuxt. Sur Dokploy, l'API tourne avec Node et conserve les données dans PostgreSQL sur Supabase.

## Déploiement Dokploy

1. Garde **Nixpacks** comme type de build. Le dépôt fournit maintenant les commandes `build` et `start` que Nixpacks détecte.
2. Dans Supabase → **SQL Editor**, exécute une seule fois [db/supabase-setup.sql](db/supabase-setup.sql). Les tables sont dans le schéma privé `miametrie` et ne sont pas exposées à l'API publique Supabase.
3. Dans Supabase → **Connect**, copie la chaîne **Session pooler** (port 5432), adaptée aux serveurs IPv4. Remplace `[YOUR-PASSWORD]` par le mot de passe de la base ; encode ses caractères spéciaux pour une URL. Colle cette chaîne complète dans `SUPABASE_DATABASE_URL` sous Dokploy → **Environment**. Le nom d'hôte doit venir de Supabase et se terminer par `.pooler.supabase.com` : `POOLER_HOST` n'est qu'un ancien exemple, pas un serveur réel. Ne mets pas cette chaîne dans Git ni dans le navigateur.
4. Dans **Environment**, définis aussi `APP_USERNAME`, `APP_PASSWORD` et `PORT=3000`. La connexion protège l'interface et l'API. Utilise un domaine HTTPS. `DB_PATH` et le montage `/app/data` ne sont plus utilisés.
5. Configure le domaine Dokploy vers le port `3000`, pousse les changements sur GitHub, puis redéploie. Le serveur vérifie au démarrage que les tables Supabase existent ; il échoue clairement si la chaîne ou le schéma manque.

Une nouvelle base Supabase démarre vide. Les données d'un éventuel ancien fichier SQLite ne sont pas transférées automatiquement. Si le fichier existe encore dans un ancien conteneur ou une sauvegarde Dokploy, conserve-le pour une importation ultérieure. La route `/health` répond sans authentification pour les contrôles de santé.

## Développement local

`npm ci` puis `npm run dev` lancent l'interface Nuxt. Pour tester l'application complète, renseigne les variables de `.env.example` dans ton environnement, lance `npm run build`, puis `npm start`.
