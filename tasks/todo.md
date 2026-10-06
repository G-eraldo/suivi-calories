# Import de recettes

- [x] Lire une recette collée ou issue d'une capture, extraire titre, portions, ingrédients et préparation.
- [x] Associer les ingrédients aux produits enregistrés et laisser corriger les quantités et correspondances.
- [x] Enregistrer et afficher la préparation avec la recette, puis vérifier le parcours et la compilation.

# Déploiement Dokploy

- [x] Ajouter un build et un démarrage détectables par Nixpacks.
- [x] Fournir le stockage SQLite persistant et l'accès protégé pour Dokploy.
- [x] Tester le démarrage et documenter les réglages Dokploy nécessaires.

# Base persistante Supabase

- [x] Remplacer le stockage SQLite du serveur Dokploy par PostgreSQL Supabase.
- [x] Préparer le schéma privé et les variables de déploiement.
- [ ] Vérifier la connexion et les requêtes sur le projet Supabase choisi.
- [x] Permettre une connexion TLS sans certificat CA, avec vérification du serveur facultative.
- [x] Retirer les dépendances inutilisées et vérifier l'audit des dépendances exécutées en production.

# Icône et build Dokploy

- [x] Fournir les icônes PNG et leurs déclarations pour l'écran d'accueil iPhone.
- [x] Utiliser directement `nuxt generate` et vérifier `npm run build` sans script intermédiaire.
