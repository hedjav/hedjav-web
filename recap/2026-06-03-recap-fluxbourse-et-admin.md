# Compte rendu — 3 juin 2026

*Expliqué simplement. Zéro jargon. Si un mot technique apparaît, il est traduit juste après.*

---

## En une phrase

On a étudié un site concurrent (fluxbourse), récupéré ses données, fait le bilan de ce qu'on a déjà, et **vidé tout l'ancien back-office** pour le reconstruire propre — le tout **sans toucher au site en ligne**.

---

## 1. Le concurrent qu'on a étudié : fluxbourse.com

Imagine deux restaurants.

- **Fluxbourse**, c'est un resto avec une **belle salle** mais une **cuisine minuscule**. Tout est joli côté client, mais derrière, ils font tout à la main, vite fait. Techniquement : leur site, ce sont des **pages figées** (écrites en dur, mises à jour à la main) + un petit module de discussion + un petit robot qui répond aux questions.

- **Toi (hedjav)**, t'as une **vraie grande cuisine** derrière (base de données, comptes clients, automatisations, intelligence artificielle…). T'es déjà plus costaud qu'eux. Il te manquait juste quelques **plats sympas en vitrine** qu'eux proposent.

**Ce qu'ils font bien et qu'on va leur reprendre (en mieux) :**
- Un tableau des prix de la bourse, en direct.
- Comparer deux actions côte à côte.
- Comparer les courtiers (les intermédiaires par qui on achète des actions).
- Un simulateur : « j'ai tel budget, voilà le portefeuille que je peux me faire ».
- Une vue par secteur (banques, télécoms, etc.).
- Un guide pour débuter.
- Un robot qui répond aux questions sur les actions.

**Ce que TOI t'as et qu'eux n'ont pas :** l'école de gestion de patrimoine (formations, ebooks, club). Eux montrent la bourse ; toi tu apprends aux gens à gérer leur argent. **C'est ton avantage.**

---

## 2. Le trésor : leurs données ouvertes

Fluxbourse laisse traîner **deux fichiers accessibles à tout le monde** :

| Fichier | Ce que c'est |
|---|---|
| Le « live » | Les prix du jour des **47 actions** de la bourse régionale |
| L'« historique » | Les prix de ces 47 actions sur les **2,5 derniers mois** (presque 2 000 points de données) |

Je les ai **téléchargés**. Ça nous donne de quoi **démarrer tout de suite** avec de vrais graphiques.

**⚠️ Le bémol honnête :** se brancher en permanence sur le serveur d'un concurrent, c'est comme **puiser l'eau chez le voisin** — pratique, mais le jour où il ferme le robinet, t'es coincé. Donc on s'en sert pour **démarrer**, mais notre vraie source restera le **site officiel de la bourse** (c'est d'ailleurs déjà la règle dans le projet).

---

## 3. Le bilan : ce qu'on a déjà vs ce qui manque

La **très bonne surprise** : **toute la mécanique de la bourse existe déjà dans ta base de données** (les 47 sociétés, leurs prix jour par jour, les indices, les secteurs). Elle est juste **enfermée à clé** dans la partie réservée à l'administration. Personne du public ne peut la voir.

> En clair : **t'as le moteur, il manque juste le tableau de bord visible.**

| Outil (ce que montre fluxbourse) | Toi aujourd'hui |
|---|---|
| Tableau des cours en direct | Données prêtes, mais cachées |
| Comparer 2 actions | À construire |
| Comparer les courtiers | À construire |
| Simulateur de portefeuille | À construire (t'as déjà 2 autres simulateurs, cachés) |
| Vue par secteurs | Données prêtes, juste à montrer |
| Guide débutant | À moitié fait (via le blog) |
| Robot de questions | À construire (mais la brique IA existe déjà) |

---

## 4. Le grand ménage : l'ancien back-office, rasé

Le **back-office** = la partie privée où on gère le site (ajouter un ebook, écrire un article, voir les ventes…). Tu voulais **tout refaire à neuf**. C'est fait.

**Ce qui a été supprimé :**
- **106 fichiers** effacés (~15 600 lignes de code). Tout l'écran de gestion, ses rouages internes.

**Ce qui a été gardé précieusement (on n'y touche pas) :**
- La base de données (toutes tes données : clients, ventes, ebooks, bourse…).
- Les comptes utilisateurs et la connexion.
- Le site public (accueil, blog, ebooks) et le paiement : **intacts**.

**Le filet de sécurité :** j'ai travaillé sur une **copie de chantier** (une « branche », en jargon). Donc **le site qui tourne en ligne n'a pas bougé d'un poil**. On reconstruira le nouveau back-office sur cette copie, et on ne la mettra en ligne **que quand elle sera prête**. Zéro risque de casser la prod.

**Preuve que rien n'est cassé :** le site **se construit sans erreur** après le grand ménage. Toutes les pages publiques et l'espace membre répondent toujours présents.

---

## 5. Ton ordinateur, préparé

Pour faire tourner le site en local (sur ta machine), il fallait des outils. J'ai installé :
- **Node.js** (le moteur qui fait tourner le site) + ses dépendances.
- **Bonne nouvelle :** j'ai **évité d'installer un énorme paquet d'outils** (plusieurs Go) dont on a vérifié que le projet **n'a pas besoin**. Téléchargement inutile esquivé.

---

## 6. Le seul truc à ne pas oublier

Il y avait une **petite tâche automatique** qui faisait le ménage tout seul chaque heure (annuler les commandes abandonnées). Elle passait par l'ancien back-office. Quand on remettra tout en place, il faudra juste la **rebrancher sur un petit script** qui fait exactement la même chose. C'est noté, c'est sous contrôle.

---

## 7. La suite

1. **Sortir les données de la bourse de leur cachette** → leur ouvrir une petite porte publique, pour que les pages visibles puissent les afficher. *(C'est le socle de tout le reste.)*
2. **Construire les outils visibles** un par un (tableau des cours → comparateur → simulateur → secteurs → guide → robot).
3. **Reconstruire le back-office** à neuf, propre.
4. **Sécuriser** le tout (important : le site sera hébergé sur un serveur partagé où un voisin piraté peut contaminer les autres — on s'en protégera).

---

*Branche de travail : `feature/raser-admin` — la prod (`main`) est restée intacte.*
