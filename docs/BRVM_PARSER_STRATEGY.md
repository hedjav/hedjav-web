# BRVM — Stratégie de parsing

Ce document explique **comment** `lib/brvm/scrapers/*` et `lib/brvm/pdf-downloader.ts` parsent `brvm.org` et **pourquoi** tels choix ont été faits. À lire avant toute modification des scrapers.

Voir aussi `docs/BRVM_URL_PATTERNS.md` (catalogue exhaustif des patterns d'URL observés dans le miroir HTTrack).

## 1. Principes directeurs

### 1.1 Résilience > élégance

Le HTML de `brvm.org` est un site Drupal qui peut évoluer sans préavis. Un sélecteur CSS profond comme `.view-content > .views-row > .views-field-title > span > a` se casse à la première refonte. **Règle** : utiliser des sélecteurs robustes basés sur les **propriétés URL des liens**, pas sur la structure DOM :

```ts
// ✅ Résilient — marche même si Drupal change sa structure
$('a[href*="boc_"][href$=".pdf"]')

// ❌ Fragile — casse au moindre changement de template
$('.view-brvm-boc > .view-content > .views-row a.pdf-link')
```

### 1.2 Miroir HTTrack = oracle hors-ligne

Le miroir local `hedjav-scrap/hedjav-scrap/www.brvm.org/` contient un snapshot complet de 219 PDFs et de toutes les pages de listing. Utiliser ce corpus pour :

- Valider qu'un nouveau sélecteur fonctionne sur l'historique
- Découvrir des patterns URL qu'on n'avait pas encore rencontrés en live
- Tester le parser dans `scripts/import-brvm-history.ts` sans faire d'appel réseau

**Ne jamais modifier le miroir.** C'est une photographie immuable, gitignored, utilisée en lecture seule.

### 1.3 Priorité des sources = priorité métier

L'ordre de confiance est :
1. `brvm.org` (officiel) — source principale
2. `bfin.brvm.org` — fallback BOC direct (URL `bfin.brvm.org/boc/BOC_JOUR/BOC_YYYYMMDD.pdf` quand elle est accessible)
3. `sikafinance.com` — agrégateur pour les données marché (cours, indices)

Le scraper et le downloader doivent **toujours** essayer dans cet ordre et s'arrêter au premier succès.

### 1.4 Dédup basée sur checksum composite

Le checksum est calculé une seule fois par `computeChecksum()` dans `lib/brvm/checksum.ts` :
```
sha256(source_slug | pdf_url_ou_source_url | title_normalisé)
```

Garanties :
- Re-scraper la même URL 1000 fois = 1 ligne DB
- Si l'URL change (republish), nouveau checksum → nouvelle ligne (correct)
- Indépendant du contenu binaire du PDF (pas besoin de downloader pour hasher)

Alternativement, `computeFileChecksum(buffer)` fait un SHA256 du contenu binaire — utilisé par le downloader pour vérifier l'intégrité des fichiers téléchargés.

## 2. Anatomie d'un scraper

Un scraper (ex: `scrapeBocListing`) suit ces étapes :

```
1. Itérer sur les pages de listing (?page=0, 1, 2, ...)
2. Pour chaque page :
   a. fetchHtml(url) avec timeout 20s
   b. cheerio.load(html)
   c. sélectionner tous les liens PDF (pattern robuste)
   d. pour chaque lien :
      - extraire pdf_url (absUrl())
      - extraire doc_date (extractBocDate() depuis le nom de fichier)
      - extraire title (depuis le texte du lien ou construit à partir de la date)
      - extraire issuer_slug (extractIssuerSlug() pour les rapports)
      - construire DocumentInput
3. S'arrêter quand la page courante ne contient plus aucun nouveau PDF
4. Retourner DocumentInput[]
```

**Ne pas faire dans le scraper** :
- Calculer le checksum (c'est `upsertDocument()` qui le fait)
- Insérer en DB (c'est `upsertDocument()` qui le fait)
- Télécharger le PDF (c'est le downloader, feature distincte)
- Retry avec backoff complexe (un simple échec HTTP → log + continuer)

## 3. Helpers partagés

Le fichier `lib/brvm/scrapers/brvm-org.ts` expose des helpers purs réutilisables :

| Helper | Rôle |
|---|---|
| `fetchHtml(url)` | GET avec User-Agent dédié + timeout + return null si erreur |
| `absUrl(href)` | Convertit un href relatif en URL absolue `https://www.brvm.org/...` |
| `cleanText(text)` | Collapse whitespace + trim |
| `extractBocDate(filename)` | `boc_YYYYMMDD_N.pdf` → `YYYY-MM-DD` |
| `extractReportDate(filename)` | `YYYYMMDD_-_fs_-_...` → `YYYY-MM-DD` |
| `extractIssuerSlug(filename)` | Extrait le slug émetteur (ex: `air_liquide_ci` → `air-liquide-ci`) |
| `parseDateText(text)` | Parse ISO / FR (`10/04/2026`) / littéral (`10 avril 2026`) |

### Règle d'extensibilité

Quand on ajoute un nouveau type documentaire (ex: communiqués de presse), on doit :
1. Documenter le pattern dans `docs/BRVM_URL_PATTERNS.md` §2.3
2. Ajouter le mapping préfixe → `DocType` dans `classifyDocument()` (`scripts/import-brvm-history.ts`) ET dans le scraper live
3. Tester sur le miroir : `npx tsx scripts/import-brvm-history.ts --dry-run` et vérifier que les nouveaux PDFs sont classifiés correctement

## 4. Fallback inter-sources

Quand la source prioritaire (`brvm.org`) est down ou renvoie 0 résultat, le scraper doit pouvoir basculer sur le fallback suivant. Pattern recommandé :

```ts
async function scrapeBocMultiSource(): Promise<DocumentInput[]> {
  // Tentative 1 : brvm.org (source officielle)
  const fromBrvm = await scrapeBocListing(3)
  if (fromBrvm.length > 0) return fromBrvm

  // Tentative 2 : bfin (format calculé)
  const fromBfin = await scrapeBfinBocDirect(startDate, endDate)
  if (fromBfin.length > 0) return fromBfin

  // Tentative 3 : aucun — retourner vide
  return []
}
```

**Important** : le fallback ne doit PAS multiplier les tentatives inutiles. Si brvm.org marche à 90%, on s'arrête après la première source OK.

## 5. Stratégie face aux évolutions du HTML live

Quand le HTML de `brvm.org` change et que le scraper ne trouve plus rien, procéder dans cet ordre :

1. **Reproduire l'échec localement** : `npx tsx scripts/brvm-health-check.ts` → doit afficher l'erreur précise
2. **Télécharger un échantillon du HTML actuel** : `curl -sL https://www.brvm.org/fr/bulletins-officiels-de-la-cote.html > /tmp/boc-live.html`
3. **Comparer au miroir** : `diff hedjav-scrap/hedjav-scrap/www.brvm.org/fr/bulletins-officiels-de-la-cote.html /tmp/boc-live.html`
4. **Adapter le sélecteur** dans `lib/brvm/scrapers/brvm-org.ts` en gardant un fallback sur l'ancien
5. **Re-tester sur le miroir** en s'assurant que le nouveau sélecteur matche toujours l'historique
6. **Re-tester en live** via `POST /api/brvm/scrape/boc`
7. **Documenter** le changement dans le commit et dans `docs/BRVM_URL_PATTERNS.md` si nécessaire

## 6. Limites connues et contournements

1. **Pas de HEAD preflight sur les PDFs** — le scraper récupère `pdf_url` sans vérifier que le fichier existe. Conséquence : `brvm_documents.pdf_url` peut pointer vers un 404. **Contournement** : le downloader (`pdf-downloader.ts`) vérifie au moment du téléchargement effectif et marque les URLs mortes.

2. **Pagination au "best effort"** — le scraper itère `?page=0..N` jusqu'à ce qu'une page ne contienne plus de nouveaux liens. Si Drupal change sa numérotation (ex: commence à `?page=1` au lieu de `0`), le premier run peut rater la première page. **Contournement** : tester les deux bases dans le scraper.

3. **Pas de rate limiting** côté client — un scrape complet fait ~10 requêtes. Si on monte en volume, ajouter un `await sleep(500)` entre les pages.

4. **Catégories d'annonces hardcodées** dans `ANNONCE_CATEGORIES` — si BRVM ajoute une nouvelle catégorie, elle est ignorée jusqu'à mise à jour du code. **Contournement** : au prochain refresh, faire un crawl exploratoire de `/fr/emetteurs/type-annonces/` pour découvrir les nouveaux slugs.

5. **Pas de parsing des PDFs** — on lit les métadonnées (titre, date, URL) mais on n'ouvre pas le contenu. Pour une feature future "résumé automatique", il faudra intégrer `pdf-parse` ou équivalent.

## 7. Checklist avant de modifier un scraper

- [ ] J'ai lu `docs/BRVM_URL_PATTERNS.md`
- [ ] J'ai identifié un pattern robuste (lien basé sur URL, pas DOM profond)
- [ ] J'ai testé sur le miroir : `npx tsx scripts/import-brvm-history.ts --dry-run` affiche mes nouveaux docs
- [ ] J'ai lancé `npx tsc --noEmit` et ça passe
- [ ] J'ai testé en live via `POST /api/brvm/scrape/{type}` avec `Authorization: Bearer $INTERNAL_API_TOKEN`
- [ ] Le checksum dédup marche (re-lancer 2x → 0 doublon)
- [ ] J'ai documenté les nouveaux patterns dans `docs/BRVM_URL_PATTERNS.md` si applicable
