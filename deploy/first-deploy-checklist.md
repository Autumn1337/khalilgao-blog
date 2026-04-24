# First-deploy checklist

Derived from spec §8.6. Work through this once when bringing a fresh
server online. After the first successful deploy, only the GitHub
Actions workflow runs.

## Server

- [ ] Ubuntu 22.04 LTS or newer, `deploy` user with sudo
- [ ] Firewall allows 80/443/TCP + 443/UDP (HTTP/3)
- [ ] `sudo mkdir -p /var/www/khalilgao.com && sudo chown deploy:deploy /var/www/khalilgao.com`
- [ ] SSH pubkey added to `~deploy/.ssh/authorized_keys`

## Nginx + TLS

- [ ] `sudo apt install nginx-extras certbot python3-certbot-nginx`
- [ ] Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/khalilgao.com`,
      symlink into `sites-enabled/`
- [ ] Put `limit_req_zone` line from the top of nginx.conf into
      `/etc/nginx/conf.d/ratelimit.conf`
- [ ] `sudo nginx -t && sudo systemctl reload nginx`
- [ ] `sudo certbot --nginx -d khalilgao.com -d www.khalilgao.com`
      (certbot auto-renews via systemd timer; no manual follow-up)

## DNS

- [ ] A/AAAA records for `khalilgao.com` and `www.khalilgao.com` point
      at the server IP
- [ ] Optional: CAA record restricting issuance to Let's Encrypt

## CI/CD

- [ ] Copy `deploy/github-actions-deploy.yml` to `.github/workflows/deploy.yml`
- [ ] Add the three repo secrets (DEPLOY_HOST / DEPLOY_USER / DEPLOY_SSH_KEY)
- [ ] Push to `main` → verify the action succeeds and the site renders

## Post-deploy sanity

- [ ] SSL Labs A+ (https://www.ssllabs.com/ssltest/)
- [ ] HTTP/3 reachable (https://http3check.net/)
- [ ] Lighthouse ≥ 95 desktop performance
- [ ] RSS validates (https://validator.w3.org/feed/)
- [ ] `curl -I https://khalilgao.com` shows HSTS + CSP headers
