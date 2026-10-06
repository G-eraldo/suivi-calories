# Miamétrie

Suivi personnel des repas, produits et recettes. L'interface est construite avec Nuxt. Sur Dokploy, l'API tourne avec Node et enregistre les données dans un fichier SQLite.

## Déploiement Dokploy

1. Garde **Nixpacks** comme type de build. Le dépôt fournit maintenant les commandes `build` et `start` que Nixpacks détecte.
2. Dans **Environment**, définis `APP_USERNAME` et `APP_PASSWORD` avec tes propres identifiants. La connexion protège l'interface et l'API. Utilise un domaine HTTPS.
3. Définis `DB_PATH=/app/data/miametrie.sqlite` et `PORT=3000`.
4. Dans **Advanced → Mounts**, ajoute un **Volume Mount** au chemin `/app/data`. Sans volume, les produits, recettes et repas seraient perdus lors d'un redéploiement. Garde une seule réplique de l'application pour cette base SQLite.
5. Configure le domaine Dokploy vers le port `3000`, puis redéploie après avoir poussé les changements du dépôt sur GitHub.

Un nouvel hébergement Dokploy démarre avec une base vide. Les données éventuelles de Cloudflare D1 ne sont pas transférées automatiquement. La route `/health` répond sans authentification pour les contrôles de santé.

## Développement local

`npm ci` puis `npm run dev` lancent l'interface Nuxt. Pour tester l'application complète avec l'API et SQLite, copie les variables de `.env.example` dans ton environnement, lance `npm run build`, puis `npm start`. Le chemin de base local par défaut est `data/miametrie.sqlite` si `DB_PATH` n'est pas défini.
