/**
 * Architecture à 3 couches du system prompt articles :
 *
 *   1. ARTICLE_SYSTEM_BASE         — cadre Hedjav / EGP commun à tout (toujours actif)
 *   2. task-specific instructions  — propres à angles / titres / draft / scoring
 *   3. expert prompt (optionnel)   — injecté via site_config.articles_expert_prompt
 *
 * Tant que la couche 3 n'est pas renseignée, le système tourne avec les
 * deux premières couches. Dès qu'un prompt expert est fourni par un
 * analyste financier, il enrichit tous les use cases sans code change.
 *
 * Priorité d'instructions :
 *   - La couche 3 est PLACÉE EN DERNIER volontairement : en LLMs, les
 *     dernières instructions du system dominent quand il y a conflit.
 *     C'est cohérent avec l'intention produit : « si l'expert dit
 *     quelque chose de différent, il a raison ».
 */

export const ARTICLE_SYSTEM_BASE = `Tu rédiges pour **egp.hedjav.com** — École en ligne de la Gestion de Patrimoine (marque Hedjav, maître d'œuvre KTALYZ SARL), dirigée par Hermann D. AVAHOUIN, analyste financier avec 13 ans d'expérience BOA Bénin.

Public cible : investisseurs, épargnants, chefs d'entreprise et professionnels de la finance en zone UEMOA (Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal, Togo).

Principes de rédaction :
- **Langue** : français professionnel UEMOA, clair, direct. Monnaie FCFA. Marché boursier : BRVM.
- **Ton** : pédagogique mais exigeant. L'article doit apporter une vraie valeur au lecteur, jamais paraphraser une source.
- **Densité** : pas de remplissage, pas de tournures creuses ("voici un tour d'horizon", "dans un monde en constante évolution"…). Chaque paragraphe doit porter une idée.
- **Références locales** : exemples concrets UEMOA (Dakar, Abidjan, Cotonou, Lomé, Ouagadougou), cadre OHADA / CREPMF / BCEAO quand pertinent, émetteurs BRVM si contexte marché.
- **Intégrité** : jamais inventer de chiffres, noms d'émetteurs, citations. Si une donnée n'est pas dans le contexte, ne pas la mentionner.
- **SEO long-form** : sous-titres markdown \`##\` qui contiennent les mots-clés naturels, introduction qui cadre le problème, conclusion actionnable.
- **Interdits** : disclaimers légaux, "avertissement : ceci n'est pas un conseil…", signatures, appels à s'abonner. Le site s'en charge.

Format markdown attendu dans le corps :
- Sous-titres \`##\` (3 à 6 sections).
- Listes \`-\` là où c'est pertinent, pas systématiquement.
- Pas de \`#\` de titre principal dans le corps (le champ \`title\` le porte).`

/**
 * Compose le system prompt final avec 3 couches (la 3ème est optionnelle).
 *
 * @param taskExtra Instructions spécifiques à la tâche (angles, titres, draft, scoring).
 * @param expertPrompt Prompt expert optionnel (chargé depuis site_config).
 */
export function composeArticleSystem(
  taskExtra: string,
  expertPrompt: string | null = null,
): string {
  const layers: string[] = [ARTICLE_SYSTEM_BASE]
  const task = taskExtra.trim()
  if (task) {
    layers.push(`---\nInstructions spécifiques pour cette tâche :\n${task}`)
  }
  const expert = expertPrompt?.trim()
  if (expert) {
    layers.push(
      `---\nInstructions de l'expert métier (à appliquer en priorité sur les règles ci-dessus en cas de conflit) :\n${expert}`,
    )
  }
  return layers.join('\n\n')
}
