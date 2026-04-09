/**
 * Email templates Hedjav — HTML inline-styled (clients mail = pas de CSS externe).
 * Charte navy/or/cream, fonts génériques (les clients mail ne chargent pas Google Fonts).
 */

const C = {
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

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://egp.hedjav.com'

/* ── Layout partagé ──────────────────────────────────────────── */

function layout(opts: { preheader?: string; bodyHtml: string }): string {
  const { preheader = '', bodyHtml } = opts
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hedjav</title>
</head>
<body style="margin:0;padding:0;background:${C.cream};font-family:Arial,Helvetica,sans-serif;color:${C.text};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
          <!-- HEADER -->
          <tr>
            <td style="background:${C.navy};padding:32px 40px;text-align:center;">
              <a href="${SITE_URL}" style="display:inline-block;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:600;color:${C.white};letter-spacing:.5px;">Hedjav</a>
              <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:${C.gold};text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                École en ligne · Gestion de patrimoine · UEMOA
              </div>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${C.text};">
              ${bodyHtml}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background:${C.navyDeep};padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
              <p style="margin:0 0 12px;">
                <a href="${SITE_URL}" style="color:${C.gold};text-decoration:none;font-weight:600;">egp.hedjav.com</a>
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

function btn(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
    <tr>
      <td style="background:${C.gold};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:${C.white};text-decoration:none;letter-spacing:.3px;">${label}</a>
      </td>
    </tr>
  </table>`
}

function hr(): string {
  return `<hr style="margin:32px 0;border:none;border-top:1px solid ${C.border};" />`
}

function smallNote(text: string): string {
  return `<p style="margin:0;font-size:13px;color:${C.muted};">${text}</p>`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

/* ── a) Welcome email (après inscription) ────────────────────── */

export function welcomeEmail(name: string) {
  const firstName = name.split(' ')[0] || 'cher membre'
  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${C.navy};line-height:1.3;">
      Bienvenue sur Hedjav, ${firstName} !
    </h1>
    <p style="margin:0 0 20px;">
      Votre compte a bien été créé. Vous avez maintenant accès à votre espace membre personnel :
      ebooks achetés, outils patrimoniaux, alertes et bien plus.
    </p>
    <p style="margin:0 0 20px;">
      Pour commencer, voici ce que vous pouvez explorer :
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/ebooks" style="color:${C.goldDark};">Nos ebooks</a> — guides pratiques BRVM, patrimoine, IA appliquée</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/blog" style="color:${C.goldDark};">Le blog</a> — analyses, études de cas et erreurs à éviter</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/dashboard" style="color:${C.goldDark};">Votre dashboard</a> — accédez à vos outils et achats</li>
    </ul>
    ${btn('Accéder à mon espace', `${SITE_URL}/dashboard`)}
    ${hr()}
    ${smallNote('Une question ? Répondez simplement à cet email — nous lisons chaque message.')}
  `

  return {
    subject: `Bienvenue sur Hedjav, ${firstName} !`,
    html: layout({ preheader: `Votre compte Hedjav est prêt, ${firstName}.`, bodyHtml }),
    text: `Bienvenue sur Hedjav, ${firstName} !\n\nVotre compte a bien été créé.\n\nAccédez à votre espace : ${SITE_URL}/dashboard\n\n— L'équipe Hedjav`,
  }
}

/* ── b) Purchase confirmation ────────────────────────────────── */

export function purchaseConfirmationEmail(name: string, ebookTitle: string, amount: number) {
  const firstName = name.split(' ')[0] || 'cher client'
  const downloadUrl = `${SITE_URL}/dashboard/mes-ebooks`
  const formattedAmount = new Intl.NumberFormat('fr-FR').format(amount)

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${C.navy};line-height:1.3;">
      Votre achat est confirmé
    </h1>
    <p style="margin:0 0 20px;">
      ${firstName}, votre paiement de <strong style="font-family:'Courier New',monospace;color:${C.navy};">${formattedAmount} FCFA</strong>
      pour <strong style="color:${C.navy};">${ebookTitle}</strong> a bien été enregistré.
    </p>
    <p style="margin:0 0 8px;">
      Vous pouvez accéder à votre ebook depuis votre espace membre :
    </p>
    ${btn('Accéder à mon ebook', downloadUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${C.muted};">
      Si le bouton ne fonctionne pas, copiez ce lien :<br />
      <a href="${downloadUrl}" style="color:${C.goldDark};word-break:break-all;">${downloadUrl}</a>
    </p>
    ${hr()}
    ${smallNote('Une question ? Répondez simplement à cet email.')}
  `

  return {
    subject: `Votre achat Hedjav est confirmé — ${ebookTitle}`,
    html: layout({ preheader: `Votre ebook "${ebookTitle}" est prêt.`, bodyHtml }),
    text: `Votre achat est confirmé !\n\n${firstName}, votre paiement de ${formattedAmount} FCFA pour "${ebookTitle}" est enregistré.\n\nAccédez à votre ebook : ${downloadUrl}\n\n— L'équipe Hedjav`,
  }
}

/* ── c) Newsletter hebdo ─────────────────────────────────────── */

export function newsletterWeeklyEmail(
  articles: { title: string; slug: string; excerpt: string }[],
  ebooks: { title: string; slug: string }[],
) {
  let bodyHtml = `
    <p style="margin:0 0 24px;font-size:13px;color:${C.muted};text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">
      Newsletter hebdomadaire
    </p>
    <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;font-weight:600;color:${C.navy};line-height:1.3;">
      Les nouveautés Hedjav cette semaine
    </h1>
  `

  if (articles.length > 0) {
    bodyHtml += `<h2 style="margin:24px 0 12px;font-family:Georgia,serif;font-size:20px;color:${C.navy};">Articles à lire</h2>`
    for (const a of articles) {
      bodyHtml += `
        <p style="margin:0 0 16px;">
          <a href="${SITE_URL}/blog/${a.slug}" style="color:${C.goldDark};font-weight:600;font-size:16px;text-decoration:none;">${a.title}</a><br />
          <span style="font-size:14px;color:${C.muted};">${a.excerpt.slice(0, 120)}${a.excerpt.length > 120 ? '…' : ''}</span>
        </p>`
    }
  }

  if (ebooks.length > 0) {
    bodyHtml += `<h2 style="margin:24px 0 12px;font-family:Georgia,serif;font-size:20px;color:${C.navy};">Nouveaux ebooks</h2>`
    for (const e of ebooks) {
      bodyHtml += `
        <p style="margin:0 0 12px;">
          <a href="${SITE_URL}/ebooks/${e.slug}" style="color:${C.goldDark};font-weight:600;text-decoration:none;">📚 ${e.title}</a>
        </p>`
    }
  }

  bodyHtml += btn('Visiter Hedjav', SITE_URL)
  bodyHtml += hr()
  bodyHtml += smallNote(`Pas envie de recevoir nos analyses ? <a href="${SITE_URL}/newsletter/unsubscribe" style="color:${C.goldDark};">Se désinscrire</a>`)

  const subject = `Hedjav — ${articles.length} article${articles.length > 1 ? 's' : ''}${ebooks.length > 0 ? `, ${ebooks.length} ebook${ebooks.length > 1 ? 's' : ''}` : ''} cette semaine`

  return {
    subject,
    html: layout({ preheader: 'Vos analyses BRVM et patrimoine de la semaine', bodyHtml }),
    text: stripHtml(bodyHtml),
  }
}

/* ── d) Lead magnet ──────────────────────────────────────────── */

export function leadMagnetEmail(name: string, ebookTitle: string, downloadUrl: string) {
  const firstName = name.split(' ')[0] || 'cher lecteur'

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${C.navy};line-height:1.3;">
      Votre guide gratuit est prêt
    </h1>
    <p style="margin:0 0 20px;">
      ${firstName}, merci pour votre intérêt ! Voici votre exemplaire gratuit de
      <strong style="color:${C.navy};">${ebookTitle}</strong>.
    </p>
    ${btn('Télécharger mon guide', downloadUrl)}
    <p style="margin:24px 0 0;font-size:13px;color:${C.muted};">
      Si le bouton ne fonctionne pas :<br />
      <a href="${downloadUrl}" style="color:${C.goldDark};word-break:break-all;">${downloadUrl}</a>
    </p>
    ${hr()}
    <p style="margin:0 0 12px;">
      Envie d'aller plus loin ? Découvrez nos <a href="${SITE_URL}/ebooks" style="color:${C.goldDark};">guides premium</a>
      sur la BRVM, le patrimoine immobilier et l'IA appliquée à la finance.
    </p>
    ${smallNote('Une question ? Répondez simplement à cet email.')}
  `

  return {
    subject: `${firstName}, votre guide "${ebookTitle}" est prêt`,
    html: layout({ preheader: `Téléchargez votre guide gratuit : ${ebookTitle}`, bodyHtml }),
    text: `Votre guide gratuit est prêt !\n\n${firstName}, téléchargez "${ebookTitle}" ici : ${downloadUrl}\n\n— L'équipe Hedjav`,
  }
}

/* ── e) Newsletter subscribed ────────────────────────────────── */

export function newsletterSubscribedEmail(name: string) {
  const firstName = name.split(' ')[0] || ''
  const greeting = firstName ? `${firstName}, bienvenue` : 'Bienvenue'

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:${C.navy};line-height:1.3;">
      ${greeting} dans la communauté Hedjav 👋
    </h1>
    <p style="margin:0 0 20px;">
      Votre inscription à la newsletter est confirmée. Vous recevrez chaque semaine nos analyses
      <strong>BRVM</strong>, nos guides patrimoniaux <strong>UEMOA</strong> et un accès en
      avant-première à nos nouveaux ebooks et formations.
    </p>
    <p style="margin:0 0 20px;">
      En attendant la prochaine édition, voici quelques contenus à explorer :
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;">
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/ebooks" style="color:${C.goldDark};">Catalogue ebooks</a> — guides pratiques BRVM, patrimoine, IA</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/blog" style="color:${C.goldDark};">Blog</a> — analyses, études de cas et erreurs à éviter</li>
      <li style="margin-bottom:8px;"><a href="${SITE_URL}/a-propos" style="color:${C.goldDark};">À propos de Hedjav</a> — qui nous sommes et notre mission</li>
    </ul>
    ${btn('Visiter Hedjav', SITE_URL)}
    ${hr()}
    ${smallNote(`Pas envie de recevoir nos analyses ? <a href="${SITE_URL}/newsletter/unsubscribe" style="color:${C.goldDark};">Se désinscrire</a>`)}
  `

  return {
    subject: 'Inscription newsletter confirmée — Bienvenue chez Hedjav',
    html: layout({ preheader: 'Vos analyses BRVM et guides patrimoniaux UEMOA chaque semaine.', bodyHtml }),
    text: `Bienvenue dans la communauté Hedjav !\n\nVotre inscription à la newsletter est confirmée.\n\nVisitez ${SITE_URL}\n\n— L'équipe Hedjav`,
  }
}
