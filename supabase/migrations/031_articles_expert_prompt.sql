-- 031_articles_expert_prompt.sql
-- Seed la clé `articles_expert_prompt` dans site_config.
--
-- But : permettre à un expert financier de fournir un prompt additionnel
-- (injecté en 3ème couche après le system de base et le prompt spécifique
-- à la tâche) SANS déploiement de code.
--
-- Tant que la valeur est vide, le système tourne avec ses deux couches
-- internes (base + tâche). Dès qu'un prompt expert est rempli, il est
-- automatiquement ajouté en fin de system prompt, avec la priorité la
-- plus forte (« ses instructions l'emportent sur les valeurs par défaut »).

insert into site_config (key, value, type, category, label, description)
values (
  'articles_expert_prompt',
  '',
  'text',
  'ia',
  'Prompt expert financier (articles)',
  'Instructions d''un expert métier qui enrichissent TOUS les prompts IA d''articles (angles, titres, brouillon, scoring). Laisser vide si pas encore fourni. Aucun formatage particulier requis : écrire en français, en ton direct, avec des règles ou exemples. Le texte est ajouté en 3ème couche du system prompt.'
)
on conflict (key) do nothing;
