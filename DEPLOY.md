# Déploiement hedjav.com — Hostinger VPS

> Stack : Ubuntu 22.04 + Node 20 + PM2 + Nginx + Cloudflare DNS
> Source : repo GitHub `hedjav/hedjav-web` (branche `main`)

---

## 1. Prérequis VPS (à faire **une seule fois**)

### Installer Node 20 + PM2 + Git
```bash
ssh root@<IP_VPS>

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx
npm install -g pm2
```

### Cloner le repo
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/hedjav/hedjav-web.git
cd hedjav-web
```

### Créer `.env.local` sur le VPS
**⚠️ Ne JAMAIS pousser `.env.local` dans Git.** Recopier manuellement les vraies valeurs depuis Supabase / Brevo / FedaPay :

```bash
nano /var/www/hedjav-web/.env.local
```

Contenu : voir `.env.local.example` à la racine du repo. Bien définir `NEXT_PUBLIC_APP_URL=https://hedjav.com`.

### Premier build + démarrage PM2
```bash
cd /var/www/hedjav-web
npm ci
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # exécuter la commande retournée pour démarrer PM2 au boot
```

---

## 2. Nginx — reverse proxy

Créer `/etc/nginx/sites-available/hedjav.com` :

```nginx
server {
    listen 80;
    server_name hedjav.com www.hedjav.com;

    # Rediriger www → apex
    if ($host = www.hedjav.com) {
        return 301 https://hedjav.com$request_uri;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache long pour les assets statiques Next
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }

    client_max_body_size 10M;
}
```

Activer + reload :
```bash
ln -s /etc/nginx/sites-available/hedjav.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

---

## 3. Cloudflare DNS

Dans le dashboard Cloudflare → **DNS** :

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `hedjav.com` | `<IP_VPS>` | ✅ Proxied (orange) |
| CNAME | `www` | `hedjav.com` | ✅ Proxied (orange) |

Dans **SSL/TLS** :
- Mode : **Full (strict)** (Cloudflare gère le certif edge)
- "Always Use HTTPS" : ON
- "Automatic HTTPS Rewrites" : ON

> Avec Cloudflare en proxy, **pas besoin de Let's Encrypt sur le VPS** — le HTTPS est terminé chez Cloudflare. Si vous voulez du HTTPS bout-en-bout, installer aussi `certbot` côté VPS et passer en "Full strict" avec un vrai certif.

---

## 4. Migrations Supabase

À chaque nouvelle migration ajoutée dans `supabase/migrations/` :
1. Supabase Dashboard → SQL Editor → New query
2. Copier-coller le contenu du `.sql`
3. Run

**Ordre actuel** :
1. `001_ebooks.sql`
2. `002_articles.sql`
3. `003_profiles.sql`
4. `004_purchases.sql`
5. `005_pages.sql`
6. `006_metadata.sql`

---

## 5. Configuration Supabase Auth

Dashboard → **Authentication → Settings** :
- Site URL : `https://hedjav.com`
- Redirect URLs : `https://hedjav.com/dashboard`, `http://localhost:3000`
- Email confirmations : **ON**

---

## 6. Granter le rôle admin

Après inscription du premier utilisateur via `/register` :

```sql
-- Supabase SQL Editor
update profiles set role='admin' where email='hermann@hedjav.com';
```

L'utilisateur peut alors accéder à `/admin`.

---

## 7. Déploiement courant (à chaque mise à jour)

Sur le VPS :
```bash
cd /var/www/hedjav-web
bash scripts/deploy.sh
```

Le script fait : `git pull → npm ci → npm run build → pm2 reload`.

Vérifier :
```bash
pm2 status
pm2 logs hedjav --lines 50
curl -I https://hedjav.com
```

---

## 8. Logs et monitoring

```bash
pm2 logs hedjav         # logs live
pm2 monit               # monitoring CPU/RAM
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 9. Rollback

Si un déploiement casse la prod :
```bash
cd /var/www/hedjav-web
git log --oneline -10              # repérer le commit stable
git reset --hard <commit-stable>
npm ci
npm run build
pm2 reload hedjav
```

---

## 10. Sauvegardes

Supabase gère les backups automatiques de la BDD (Settings → Database → Backups).
Pour les fichiers `public/` versionnés dans Git → déjà sauvegardés sur GitHub.
Pour les uploads futurs (Supabase Storage) → activer les backups dans Supabase.
