# Templates email Supabase — Hedjav

Copier-coller dans **Supabase Dashboard → Authentication → Email Templates**.

Les variables Supabase (`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`) sont injectées automatiquement.

---

## 1. Confirm sign up

**Subject :** Confirmez votre inscription à Hedjav

```html
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F5EE;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F5EE;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
        <tr><td style="background:#1B2A4A;padding:32px 40px;text-align:center;">
          <a href="{{ .SiteURL }}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;letter-spacing:.5px;">Hedjav</a>
          <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#C5A028;text-transform:uppercase;letter-spacing:2px;font-weight:600;">École en ligne · Gestion de patrimoine · UEMOA</div>
        </td></tr>
        <tr><td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2A4A;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1B2A4A;">Confirmez votre inscription</h1>
          <p style="margin:0 0 20px;">Bienvenue ! Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte Hedjav.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
            <tr><td style="background:#C5A028;border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Confirmer mon email</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#6B82B0;">Si vous n'avez pas créé de compte sur Hedjav, ignorez simplement cet email.</p>
        </td></tr>
        <tr><td style="background:#0D1628;padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
          <p style="margin:0;">Hedjav — KTALYZ SARL — Cotonou, Bénin<br />École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 2. Reset password

**Subject :** Réinitialisez votre mot de passe Hedjav

```html
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F5EE;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F5EE;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
        <tr><td style="background:#1B2A4A;padding:32px 40px;text-align:center;">
          <a href="{{ .SiteURL }}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;letter-spacing:.5px;">Hedjav</a>
          <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#C5A028;text-transform:uppercase;letter-spacing:2px;font-weight:600;">École en ligne · Gestion de patrimoine · UEMOA</div>
        </td></tr>
        <tr><td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2A4A;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1B2A4A;">Réinitialisez votre mot de passe</h1>
          <p style="margin:0 0 20px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
            <tr><td style="background:#C5A028;border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Nouveau mot de passe</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#6B82B0;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
        </td></tr>
        <tr><td style="background:#0D1628;padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
          <p style="margin:0;">Hedjav — KTALYZ SARL — Cotonou, Bénin<br />École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 3. Magic link

**Subject :** Votre lien de connexion Hedjav

```html
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F5EE;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F5EE;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
        <tr><td style="background:#1B2A4A;padding:32px 40px;text-align:center;">
          <a href="{{ .SiteURL }}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;letter-spacing:.5px;">Hedjav</a>
          <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#C5A028;text-transform:uppercase;letter-spacing:2px;font-weight:600;">École en ligne · Gestion de patrimoine · UEMOA</div>
        </td></tr>
        <tr><td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2A4A;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1B2A4A;">Votre lien de connexion</h1>
          <p style="margin:0 0 20px;">Cliquez sur le bouton ci-dessous pour vous connecter à votre compte Hedjav. Ce lien est à usage unique.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
            <tr><td style="background:#C5A028;border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Se connecter</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#6B82B0;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé de connexion, ignorez cet email.</p>
        </td></tr>
        <tr><td style="background:#0D1628;padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
          <p style="margin:0;">Hedjav — KTALYZ SARL — Cotonou, Bénin<br />École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 4. Invite user

**Subject :** Vous êtes invité à rejoindre Hedjav

```html
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F5EE;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F5EE;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
        <tr><td style="background:#1B2A4A;padding:32px 40px;text-align:center;">
          <a href="{{ .SiteURL }}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;letter-spacing:.5px;">Hedjav</a>
          <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#C5A028;text-transform:uppercase;letter-spacing:2px;font-weight:600;">École en ligne · Gestion de patrimoine · UEMOA</div>
        </td></tr>
        <tr><td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2A4A;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1B2A4A;">Vous êtes invité !</h1>
          <p style="margin:0 0 20px;">Vous avez été invité à rejoindre <strong>Hedjav</strong>, l'école en ligne de la gestion de patrimoine pour la zone UEMOA.</p>
          <p style="margin:0 0 20px;">Cliquez ci-dessous pour créer votre compte et accéder à votre espace membre.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
            <tr><td style="background:#C5A028;border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Accepter l'invitation</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#0D1628;padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
          <p style="margin:0;">Hedjav — KTALYZ SARL — Cotonou, Bénin<br />École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

---

## 5. Change email address

**Subject :** Confirmez votre nouvelle adresse email

```html
<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F8F5EE;font-family:Arial,Helvetica,sans-serif;color:#1B2A4A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F5EE;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(13,22,40,.08);">
        <tr><td style="background:#1B2A4A;padding:32px 40px;text-align:center;">
          <a href="{{ .SiteURL }}" style="display:inline-block;text-decoration:none;font-family:Georgia,serif;font-size:36px;font-weight:600;color:#FFFFFF;letter-spacing:.5px;">Hedjav</a>
          <div style="margin-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#C5A028;text-transform:uppercase;letter-spacing:2px;font-weight:600;">École en ligne · Gestion de patrimoine · UEMOA</div>
        </td></tr>
        <tr><td style="padding:40px;font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#1B2A4A;">
          <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:600;color:#1B2A4A;">Confirmez votre nouvelle adresse</h1>
          <p style="margin:0 0 20px;">Vous avez demandé à changer votre adresse email sur Hedjav. Cliquez ci-dessous pour confirmer cette nouvelle adresse.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;">
            <tr><td style="background:#C5A028;border-radius:8px;">
              <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Confirmer le changement</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;font-size:13px;color:#6B82B0;">Si vous n'avez pas demandé ce changement, ignorez cet email — votre adresse actuelle reste inchangée.</p>
        </td></tr>
        <tr><td style="background:#0D1628;padding:32px 40px;text-align:center;font-family:Arial,sans-serif;font-size:12px;color:#7A94B8;">
          <p style="margin:0;">Hedjav — KTALYZ SARL — Cotonou, Bénin<br />École en ligne de la Gestion de Patrimoine — Zone UEMOA</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```
