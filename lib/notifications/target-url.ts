/**
 * Résolution de la destination admin d'une notification.
 *
 * Source unique utilisée partout (bell dropdown, table /admin/notifications,
 * trigger SQL, helper createNotification). Évite la régression classique où
 * une notif retombe sur /admin au lieu de la page utile.
 *
 * Règle :
 *   1. Si `target_url` est déjà défini (rempli par trigger ou createNotification)
 *      → on l'utilise tel quel.
 *   2. Sinon, on reconstruit à partir de `type` + `metadata` + `entity_*`.
 *   3. Fallback : /admin.
 */

type NotifLike = {
  type: string
  metadata?: Record<string, unknown> | null
  target_url?: string | null
  entity_type?: string | null
  entity_id?: string | null
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v
  return null
}

/**
 * Calcule la cible de navigation d'une notification.
 * Toujours un path absolu commençant par /.
 */
export function resolveNotificationTarget(n: NotifLike): string {
  if (n.target_url && n.target_url.startsWith('/')) return n.target_url

  const meta = n.metadata ?? {}
  const documentId = str(meta.document_id) || (n.entity_type === 'brvm_document' ? n.entity_id : null)
  const purchaseId = str(meta.purchase_id) || (n.entity_type === 'purchase' ? n.entity_id : null)
  const profileId = str(meta.profile_id) || (n.entity_type === 'profile' ? n.entity_id : null)
  const subscriberEmail = str(meta.subscriber_email) || (n.entity_type === 'subscriber' ? n.entity_id : null)
  const campaignId = str(meta.campaign_id)
  const sendId = str(meta.send_id)
  const articleId = str(meta.article_id)

  switch (n.type) {
    case 'brvm_document':
      return documentId ? `/admin/brvm?doc=${encodeURIComponent(documentId)}` : '/admin/brvm'
    case 'brvm_alert':
    case 'brvm_maintenance':
      return '/admin/brvm/maintenance'
    case 'brvm_digest_sent':
      return '/admin/brvm/alertes'
    case 'purchase':
      return purchaseId ? `/admin/ventes?id=${encodeURIComponent(purchaseId)}` : '/admin/ventes'
    case 'registration':
      return profileId ? `/admin/membres/${encodeURIComponent(profileId)}` : '/admin/membres'
    case 'member':
      return '/admin/membres'
    case 'newsletter':
    case 'subscriber':
      return subscriberEmail
        ? `/admin/newsletter?email=${encodeURIComponent(subscriberEmail)}`
        : '/admin/newsletter'
    case 'unsubscribe':
      return subscriberEmail
        ? `/admin/newsletter?email=${encodeURIComponent(subscriberEmail)}&tab=inactifs`
        : '/admin/newsletter'
    case 'campaign':
      return campaignId ? `/admin/campagnes/${encodeURIComponent(campaignId)}` : '/admin/campagnes'
    case 'campaign_send':
      return sendId && campaignId
        ? `/admin/campagnes/${encodeURIComponent(campaignId)}?send=${encodeURIComponent(sendId)}`
        : '/admin/campagnes'
    case 'article':
    case 'article_published':
      return articleId ? `/admin/articles/${encodeURIComponent(articleId)}` : '/admin/articles'
    case 'report':
    case 'brvm_report':
      return '/admin/brvm'
    case 'ai_error':
    case 'error':
      return '/admin/ia'
    default:
      return '/admin'
  }
}

/**
 * Icône texte courte pour l'UI bell (8×8 mono).
 * Centralisé pour rester cohérent entre dropdown et table.
 */
export function notificationIcon(type: string): string {
  switch (type) {
    case 'brvm_document':
    case 'brvm_digest_sent':
    case 'brvm_alert':
    case 'brvm_maintenance':
    case 'brvm_report':
      return '§'
    case 'purchase':
      return '$'
    case 'registration':
    case 'member':
      return '+'
    case 'newsletter':
    case 'subscriber':
      return '@'
    case 'unsubscribe':
      return '-'
    case 'campaign':
    case 'campaign_send':
      return '✉'
    case 'article':
    case 'article_published':
      return '¶'
    case 'ai_error':
    case 'error':
      return '!'
    case 'report':
      return '∑'
    default:
      return '•'
  }
}

/**
 * Couleur par type pour le badge mini.
 */
export function notificationColor(type: string): string {
  switch (type) {
    case 'purchase':
      return 'var(--admin-success, #8BE07A)'
    case 'newsletter':
    case 'subscriber':
      return 'var(--admin-info, #4A90D9)'
    case 'registration':
    case 'member':
    case 'brvm_document':
    case 'brvm_digest_sent':
    case 'brvm_report':
      return 'var(--admin-accent, #C5A028)'
    case 'campaign':
    case 'campaign_send':
      return '#B47AE0'
    case 'article':
    case 'article_published':
      return '#4A90D9'
    case 'ai_error':
    case 'error':
    case 'brvm_alert':
    case 'brvm_maintenance':
      return 'var(--admin-danger, #ff6b6b)'
    default:
      return 'var(--admin-text-muted)'
  }
}

/**
 * Libellé humain pour l'UI (table notifications, badges).
 */
export function notificationTypeLabel(type: string): string {
  switch (type) {
    case 'brvm_document':
      return 'Document BRVM'
    case 'brvm_digest_sent':
      return 'Digest BRVM envoyé'
    case 'brvm_alert':
      return 'Alerte BRVM'
    case 'brvm_maintenance':
      return 'Maintenance BRVM'
    case 'brvm_report':
    case 'report':
      return 'Rapport'
    case 'purchase':
      return 'Achat'
    case 'registration':
      return 'Inscription'
    case 'member':
      return 'Membre'
    case 'newsletter':
    case 'subscriber':
      return 'Newsletter'
    case 'unsubscribe':
      return 'Désinscription'
    case 'campaign':
      return 'Campagne'
    case 'campaign_send':
      return 'Envoi campagne'
    case 'article':
    case 'article_published':
      return 'Article'
    case 'ai_error':
      return 'Erreur IA'
    case 'error':
      return 'Erreur'
    default:
      return type
  }
}
