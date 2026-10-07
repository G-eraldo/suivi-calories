# Recherche dans les sélecteurs mobiles

- [x] Créer un sélecteur avec recherche visible dans le menu ouvert.
- [x] L’utiliser pour les produits des recettes et les produits/recettes du journal.
- [x] Vérifier sélection, validation, clavier, présentation responsive et build.

# Recherche dans les listes

- [x] Ajouter une recherche aux produits, aliments préremplis et recettes.
- [x] Filtrer les sélecteurs de repas et d’ingrédients sans perdre la sélection.
- [x] Vérifier la compilation et les règles de présentation mobile concernées.

# Choix de l’unité dans les ingrédients

- [x] Ajouter g/cl à côté de chaque ingrédient liquide et conserver le choix à l’édition.
- [x] Calculer la recette selon l’unité explicitement choisie et signaler une divergence avec la fiche produit.
- [x] Vérifier le cas de 1 g d’huile, les autres ingrédients, les tests et le build.

# Modification des recettes

- [x] Préremplir le formulaire depuis une recette enregistrée et signaler les unités d’ingrédients à revérifier.
- [x] Mettre à jour la recette côté API avec recalcul des valeurs par portion, sans réécrire les repas passés.
- [x] Vérifier l’édition, les droits d’accès, les tests et le build.

# Affichage des repas sur mobile

- [x] Regrouper les aliments du journal par moment de repas dans une seule carte.
- [x] Rendre chaque ligne et ses actions lisibles sur petit écran.
- [x] Vérifier les règles responsive, le regroupement et la compilation.

# Unité des liquides

- [x] Choisir la base nutritionnelle des liquides (100 g ou 100 ml) sur chaque produit, y compris les produits existants.
- [x] Saisir les quantités correspondantes en g ou cl dans les recettes et le journal.
- [x] Vérifier le cas de l’huile pesée en grammes et les parcours existants en cl.

# Recherche par code-barres

- [x] Lire un code avec la caméra ou par saisie manuelle.
- [x] Interroger Open Food Facts côté serveur et préremplir les valeurs nutritionnelles sans inventer les champs absents.
- [x] Vérifier une installation propre, les tests, le build et les dépendances de production.

# Journal plus rapide et tendances

- [x] Corriger, déplacer et dupliquer un repas avec validation côté serveur.
- [x] Afficher les repas récents/fréquents et enregistrer des favoris utilisables en un geste.
- [x] Ajouter des bilans 7 et 30 jours avec moyennes et couverture des données.
- [x] Vérifier les parcours concernés, les tests et le build.

# Féculents pesés crus

- [x] Clarifier la saisie des pâtes et du riz crus dans les produits et recettes.
- [x] Afficher la quantité crue par portion et sécuriser l'association lors de l'import.
- [x] Vérifier les cas concernés et la compilation.

# Correction du build Dokploy

- [x] Retirer l’override incompatible de simple-git et synchroniser le lockfile.
- [x] Vérifier une installation propre et le build avec Node 22.14.0, puis pousser sur main.

# Base nutritionnelle des liquides

- [x] Indiquer 100 ml pour les produits liquides et faire correspondre les explications aux calculs en volume.
- [x] Vérifier le lait à 50 cl, les tests et le build, puis pousser sur main.

# Unités des quantités

- [x] Saisir et afficher les liquides en cl et les œufs en pièces dans les repas et recettes.
- [x] Vérifier les conversions et la compilation.

# Fibres et dépendances de sécurité

- [x] Ajouter les fibres facultatives aux produits, recettes, repas, OCR et affichages, avec migration des données existantes.
- [x] Corriger les dépendances vulnérables lorsque des versions sûres existent.
- [ ] Vérifier les tests, le build, l'audit et la mise en production. Tests et build validés ; redéploiement Dokploy à vérifier.

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
