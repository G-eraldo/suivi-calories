# Catalogue des aliments préremplis

- [x] Afficher les références nutritionnelles existantes dans l’onglet Produits.
- [x] Permettre leur ajout à Mes produits et vérifier le build.

# Import de recettes

- [x] Lire une recette collée ou issue d'une capture, extraire titre, portions, ingrédients et préparation.
- [x] Associer les ingrédients aux produits enregistrés et laisser corriger les quantités et correspondances.
- [x] Enregistrer et afficher la préparation avec la recette, puis vérifier le parcours et la compilation.

# Ingrédients sans produit

- [x] Permettre de marquer explicitement un ingrédient comme non comptabilisé dans la recette.
- [x] Conserver cet ingrédient dans la recette enregistrée sans lui attribuer de calories.
- [x] Vérifier le parcours avec eau, levure et un produit comptabilisé.

# Valeur de référence de la levure sèche

- [x] Préremplir la levure boulangère déshydratée avec une référence nutritionnelle vérifiée.
- [x] Vérifier le calcul pour 5 g et l’enregistrement depuis une recette.

# Œuf, banane et pomme

- [x] Ajouter les valeurs de référence pour 100 g et le poids comestible moyen d’une pièce.
- [x] Permettre l’ajout au journal par pièce et le préremplissage dans les recettes.
- [x] Vérifier le calcul, l’import des recettes et le build.

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

# Accès sur iPhone

- [x] Déclarer l'icône et le manifeste dans le HTML initial et rendre les icônes accessibles à Safari.
- [x] Conserver la connexion avec un cookie de session sécurisé et renouvelable.
- [x] Vérifier le build et les parcours de session et de cache.
