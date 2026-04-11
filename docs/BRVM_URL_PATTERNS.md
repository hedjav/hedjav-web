# BRVM — Catalogue des patterns d'URL

Catalogue des patterns d'URL observés sur `www.brvm.org/fr` via l'analyse du miroir HTTrack local `hedjav-scrap/`. Ce document est la **source de vérité** pour le scraper et le downloader PDF.

**Toutes ces observations proviennent de 219 PDFs et des pages HTML listées dans le miroir.** Pas de supposition.

## 1. Pages de listing (points d'entrée scraping)

| Section | URL HTML | Pagination observée |
|---|---|---|
| BOC quotidien | `https://www.brvm.org/fr/bulletins-officiels-de-la-cote.html` | Non paginée côté miroir (tous les BOC sur une page) |
| Bulletins mensuels | `https://www.brvm.org/fr/bulletins-mensuels.html` | `?page=1,2,3,4...` (10+ pages dans le miroir) |
| Avis & Publications | `https://www.brvm.org/fr/marche/avis-et-publications/publications.html` | `?page=N` |
| Communiqués émetteurs | `https://www.brvm.org/fr/emetteurs/type-annonces/communiques.html` | `?page=N` |
| Changements de dirigeants | `https://www.brvm.org/fr/emetteurs/type-annonces/changements-de-dirigeants.html` | `?page=N` |
| Franchissements de seuil | `https://www.brvm.org/fr/emetteurs/type-annonces/franchissements-de-seuil.html` | `?page=N` |
| Assemblées générales | `https://www.brvm.org/fr/emetteurs/type-annonces/assemblees-generales.html` | `?page=N` |
| Augmentations capital | `https://www.brvm.org/fr/emetteurs/type-annonces/augmentation-capital.html` | `?page=N` |
| Distributions dividendes | `https://www.brvm.org/fr/emetteurs/type-annonces/distribution-dividendes.html` | `?page=N` |
| Notes d'information | `https://www.brvm.org/fr/emetteurs/type-annonces/notes-information.html` | `?page=N` |
| Opérations financières | `https://www.brvm.org/fr/emetteurs/type-annonces/operations-financieres.html` | `?page=N` |
| Sociétés cotées | `https://www.brvm.org/fr/emetteurs/societes-cotees` | `?page=N` |
| Rapports société cotée | `https://www.brvm.org/fr/rapports-societe-cotes/[emetteur-slug].html` | Une page par émetteur |
| Textes réglementaires | `https://www.brvm.org/fr/textes-reglementaires/` | Non paginé |

### Particularité HTTrack : encodage des paramètres

HTTrack remplace les query strings par un **suffixe hexadécimal** dérivé du hash de l'URL :

```
bulletins-mensuels.html           ← page 1 (URL canonique sans ?page=)
bulletins-mensuels235c.html       ← ?page=1 probablement
bulletins-mensuels2679.html       ← ?page=2
bulletins-mensuels4658.html       ← ?page=3
bulletins-mensuels9ba9.html       ← ?page=4
...
```

**Conséquence pratique** : pour traverser toutes les pages en live, le scraper itère sur `?page=0,1,2...` (le premier est souvent `?page=0` dans Drupal, parfois `?page=1`). Il faut gérer les deux cas et s'arrêter quand une page ne contient plus de nouveaux liens PDF.

## 2. Patterns d'URL PDF

Tous les PDFs BRVM sont servis depuis un unique répertoire Drupal : `/sites/default/files/`. URL complète :

```
https://www.brvm.org/sites/default/files/[FILENAME].pdf
```

### 2.1 BOC (Bulletin Officiel de la Cote)

Pattern nom de fichier :
```
boc_YYYYMMDD.pdf              ← forme de base
boc_YYYYMMDD_N.pdf            ← version N (ex: boc_20260410_2.pdf) — Drupal ajoute un suffixe si le fichier est uploadé plusieurs fois
```

Exemples concrets du miroir :
```
boc_20251231_2.pdf
boc_20260327_2.pdf
boc_20260401_2.pdf
boc_20260410_2.pdf
```

**Tous les BOC observés ont le suffixe `_2`**. Drupal gère ainsi les remplacements de fichier (le `_1` original a probablement été supprimé).

### 2.2 États financiers / rapports (`fs` = financial statement)

Pattern :
```
YYYYMMDD_-_fs_-_[emetteur-slug]_-_exercice_YYYY.pdf
YYYYMMDD_-_fs_-_[emetteur-slug]_-_exercice_YYYY_N.pdf    ← version 2 si remplacement
```

Exemples :
```
20120302_-_fs_-_vivo_energy_ci_-_exercice_2012.pdf
20130118_-_fs_-_cfao_motors_ci_-_exercice_2013.pdf
20150904_-_fs_-_bank_of_africa_ng_-_exercice_2015_1.pdf
20151007_-_fs_-_saph_ci_-_exercice_2015.pdf
```

La date au début est la **date de publication**, pas la date de l'exercice. Le slug émetteur est entre `_fs_-_` et `_-_exercice_`.

### 2.3 Communiqués, changements, franchissements

Pattern générique :
```
YYYYMMDD_-_[categorie]_-_[emetteur-slug]_[NUM]?.pdf
```

Exemples du miroir (triés par fréquence) :
```
20240822_-_communique_-_augmentation_de_capital_par_incorporation_de_reserves_-_boa_benin_1.pdf
20240822_-_communique_-_nsia_banque_ci.pdf
20240828_-_communique_-_changement_important_dans_le_ca_-_oragroup_tg.pdf
20240905_-_communique_-_changement_important_dans_la_direction_-_boa_niger.pdf
20230215_-_declarations_de_franchissement_de_seuils_-_bicici.pdf
20230627_-_communique_declaration_franchissement_seuils_-_bici_ci_1.pdf
20240819_-_changement_important_dans_la_direction_-_vivo_energy_ci.pdf
```

Sous-catégories observées (préfixes après la date) :

| Préfixe | Type | DocType Hedjav |
|---|---|---|
| `fs_-_` | État financier | `rapport_annuel` / `rapport_trimestriel` / `rapport_semestriel` selon l'exercice |
| `communique_` | Communiqué générique | `communique` |
| `communique_amf` | Communiqué AMF-UMOA | `note_information` |
| `communique_de_presse_` | Communiqué de presse | `communique` |
| `communique_declaration_franchissement_seuils_` | Franchissement de seuil | `annonce` |
| `declarations_de_franchissement_de_seuils_` | Idem | `annonce` |
| `changement_important_dans_la_direction_` | Changement dirigeant | `annonce` |
| `changement_important_au_sein_de_la_direction_` | Variante | `annonce` |
| `avis_ndeg` | Avis officiel numéroté | `avis` |
| `avis_de_convocation_` | Convocation AG | `annonce` |
| `notation_financiere_` | Rapport de notation | `autre` |
| `ordre_du_jour_` | Ordre du jour AG | `annonce` |
| `pouvoir_` | Pouvoir AG | `annonce` |
| `projet_de_resolutions_` | Résolutions AG | `annonce` |
| `calendrier_de_paiement_des_dividendes_` | Calendrier dividendes | `annonce` |
| `bilan_semestriel_du_contrat_de_liquidite_` | Bilan liquidité | `rapport_semestriel` |
| `report_de_lassemblee_generale_ordinaire_` | Report AG | `annonce` |
| `erratum_` | Erratum d'une publication antérieure | `annonce` |

## 3. Slugs d'émetteurs observés

Les slugs suivent la convention `{nom-court}_{pays_iso2}` en snake_case. Exemples du miroir :

```
boa_benin, boa_burkina_faso, boa_ci, boa_mali, boa_niger, boa_senegal
bici_ci, bicici, nsia_banque_ci
cfao_motors_ci, vivo_energy_ci, shell_ci
saph_ci, sonatel, orange_ci
oragroup_tg, ecobank_tg, setao_ci
air_liquide_ci, erium_ci  # même entité, air_liquide renommée en erium
sode_ci, lnb_sa
```

Codes pays observés : `ci` (Côte d'Ivoire), `sn` / `senegal`, `bf` / `burkina_faso`, `tg` (Togo), `ng` (Niger), `ml` / `mali`, `benin`.

## 4. URL de découverte depuis un émetteur

Pour lister tous les documents d'un émetteur spécifique :

```
https://www.brvm.org/fr/rapports-societe-cotes/[emetteur-slug].html
```

Exemple :
```
https://www.brvm.org/fr/rapports-societe-cotes/air-liquide-ci.html
```

⚠️ Le slug dans cette URL utilise `-` (tiret) alors que dans les noms de fichier c'est `_` (underscore). **Conversion à faire** : `air_liquide_ci` → `air-liquide-ci` pour l'URL HTML, `air-liquide-ci` → `air_liquide_ci` pour matcher dans les noms de PDF.

## 5. Calcul d'URL de PDF depuis le miroir local

Un fichier local du miroir à `hedjav-scrap/hedjav-scrap/www.brvm.org/sites/default/files/boc_20260410_2.pdf` correspond à l'URL publique :

```
https://www.brvm.org/sites/default/files/boc_20260410_2.pdf
```

C'est-à-dire : `hedjav-scrap/hedjav-scrap/` + chemin relatif = URL publique avec préfixe `https://`. Cette correspondance 1:1 est utilisée par `scripts/import-brvm-history.ts` pour reconstruire les URLs officielles à partir du miroir local.

## 6. Robots.txt observé

HTTrack a loggé les restrictions robots.txt :
```
/includes/, /admin/, /search/, /user/login/
```

Ces chemins sont interdits. Le scraper doit les éviter (il le fait, rien dans le code actuel ne pointe vers eux).

## 7. Tips pratiques pour le parser

1. **Détection de date** : chercher `\b\d{4}\d{2}\d{2}\b` ou `boc_(\d{4})(\d{2})(\d{2})` dans le nom de fichier. Tous les PDFs commencent par une date compréhensible.

2. **Détection du type** : utiliser le tableau §2.3 ci-dessus comme dictionnaire préfixe → `doc_type`. Un fallback `'autre'` suffit quand rien ne match.

3. **Extraction du slug émetteur** : regex `_fs_-_([a-z0-9_]+?)_-_(exercice|rapport|arr|etats|comptes)` ou fallback `_-_([a-z0-9_]+?)(\.pdf|_ex_|_[0-9]+\.pdf)`. Les deux couvrent 90% des cas.

4. **Déduplication des versions `_1`, `_2`, `_N`** : le suffixe numérique final indique une version. Pour la veille, on garde généralement la **dernière version** (plus grand N), mais pour le downloader on télécharge telle qu'elle est indexée.

5. **Parsing pagination** : le sélecteur Drupal `.pager .pager-next a` ou `li.pager__item--next a` donne le lien vers la page suivante. Alternative : itérer tant que la page contient au moins un nouveau lien PDF non vu.

6. **Robustesse face aux évolutions HTML** : préférer `a[href$=".pdf"]` + filtrage par préfixe nom de fichier plutôt que des sélecteurs CSS profonds qui dépendent de la structure Drupal.
