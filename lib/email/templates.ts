/**
 * Email templates Hedjav — HTML inline-styled (clients mail = pas de CSS externe).
 * Charte navy/or/cream, fonts génériques (les clients mail ne chargent pas Google Fonts).
 */

const COLORS = {
  navy: '#1B2A4A',
  navyDeep: '#0D1628',
  gold: '#C5A028',
  goldDark: '#9A6800',
  cream: '#F8F5EE',
  white: '#FFFFFF',
  text: '#1B2A4A',
  muted: '#6B82B0',
  border: '#E0E6EF',
} as const

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://hedjav.com'

/**
 * Layout email partagé : header navy avec logo, contenu cream, footer.
 */
function layout(opts: { preheader?: string; bodyHtml: string }): string {
  const { preheader = '', bodyHtml } = opts
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hedjav</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};font-family:Georgia,serif;color:${COLORS.text};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${COLORS.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
          <!-- HEADER -->
          <tr>
            <td style="background:${COLORS.navy};padding:32px 40px;text-align:center;">
              <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:${COLORS.white};letter-spacing:.5px;">Hedjav</a>
              <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:${COLORS.gold};text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                École en ligne · Gestion de patrimoine · UEMOA
              </div>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:${COLORS.text};">
              ${bodyHtml}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:${COLORS.navyDeep};padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
              <p style="margin:0 0 12px;">
                <a href="${SITE_URL}" style="color:${COLORS.gold};text-decoration:none;font-weight:600;">hedjav.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:hedjav@gmail.com" style="color:#C2CEDE;text-decoration:none;">hedjav@gmail.com</a>
              </p>
              <p style="margin:0;">
                Hedjav — KTALYZ SARL — Cotonou, Bénin<br />
                École en ligne de la Gestion de Patrimoine — Zone UEMOA
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
    <tr>
      <td style="background:${COLORS.gold};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:${COLORS.white};text-decoration:none;letter-spacing:.3px;">${label}</a>
      </td>
    </tr>
  </table>`
}

// ============================================================
// 1. Email de confirmation d'achat ebook
// ============================================================
export function purchaseConfirmEmail(opts: {
  ebookTitle: string
  customerEmail: string
}): { subject: string; html: string; text: string } {
  const { ebookTitle } = opts
  const downloadUrl = `${SITE_URL}/dashboard/mes-ebooks`

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${COLORS.navy};line-height:1.3;">
      Merci pour votre achat 🎉
    </h1>
    <p style="margin:0 0 20px;">
      Votre paiement pour <strong style="color:${COLORS.navy};">${ebookTitle}</strong> a bien été enregistré.
    </p>
    <p style="margin:0 0 8px;">
      Vous pouvez accéder à votre ebook depuis votre espace membre Hedjav :
    </p>
    ${button('Accéder à mon ebook', downloadUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${COLORS.muted};">
      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
      <a href="${downloadUrl}" style="color:${COLORS.goldDark};word-break:break-all;">${downloadUrl}</a>
    </p>
    <hr style="margin:32px 0;border:none;border-top:1px solid ${COLORS.border};" />
    <p style="margin:0;font-size:13px;color:${COLORS.muted};">
      Une question ? Répondez simplement à cet email — nous lisons chaque message.
    </p>
  `

  return {
    subject: `Votre achat Hedjav est confirmé — ${ebookTitle}`,
    html: layout({
      preheader: `Votre ebook ${ebookTitle} est prêt à être téléchargé.`,
      bodyHtml,
    }),
    text: `Merci pour votre achat !\n\nVotre paiement pour "${ebookTitle}" a bien été enregistré.\n\nAccédez à votre ebook : ${downloadUrl}\n\n— L'équipe Hedjav`,
  }
}

// ============================================================
// 2. Email newsletter hebdo
// ============================================================
export function newsletterEmail(opts: {
  subject: string
  innerHtml: string // HTML généré par Claude (h2/p/ul/a)
}): { subject: string; html: string; text: string } {
  const { subject, innerHtml } = opts

  const bodyHtml = `
    <p style="margin:0 0 24px;font-size:13px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
      Newsletter hebdomadaire
    </p>
    ${innerHtml}
    <hr style="margin:32px 0;border:none;border-top:1px solid ${COLORS.border};" />
    <p style="margin:0;font-size:13px;color:${COLORS.muted};">
      Pas envie de recevoir nos analyses ? <a href="${SITE_URL}/newsletter/unsubscribe" style="color:${COLORS.goldDark};">Se désinscrire</a>
    </p>
  `

  return {
    subject,
    html: layout({ preheader: 'Vos analyses BRVM et patrimoine de la semaine', bodyHtml }),
    text: stripHtml(innerHtml),
  }
}

// ============================================================
// 3. Email de bienvenue (inscription newsletter)
// ============================================================
export function welcomeNewsletterEmail(): { subject: string; html: string; text: string } {
  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${COLORS.navy};line-height:1.3;">
      Bienvenue dans la communauté Hedjav 👋
    </h1>
    <p style="margin:0 0 20px;">
      Merci de nous rejoindre. Vous recevrez chaque semaine nos analyses
      <strong>BRVM</strong>, nos guides patrimoniaux <strong>UEMOA</strong> et un accès en
      avant-première à nos nouveaux ebooks et formations.
    </p>
    <p style="margin:0 0 20px;">
      En attendant la prochaine édition, voici quelques contenus que vous pouvez explorer :
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/ebooks" style="color:${COLORS.goldDark};">Catalogue ebooks</a> — guides pratiques sur la BRVM, le patrimoine et l'IA appliquée à la finance</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/blog" style="color:${COLORS.goldDark};">Blog</a> — analyses, études de cas et erreurs à éviter</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/a-propos" style="color:${COLORS.goldDark};">À propos de Hedjav</a> — qui nous sommes et notre mission</li>
    </ul>
    ${button('Visiter Hedjav', SITE_URL)}
  `

  return {
    subject: 'Bienvenue dans la communauté Hedjav',
    html: layout({
      preheader: 'Vos analyses BRVM et guides patrimoniaux UEMOA chaque semaine.',
      bodyHtml,
    }),
    text: `Bienvenue dans la communauté Hedjav !\n\nMerci de nous rejoindre. Vous recevrez chaque semaine nos analyses BRVM, nos guides patrimoniaux UEMOA et nos exclusivités.\n\nVisitez ${SITE_URL}\n\n— L'équipe Hedjav`,
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
