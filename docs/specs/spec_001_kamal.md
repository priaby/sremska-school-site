# Spec 001: Deploy sremska-school-site to VPS using Kamal

## Context & Goals

### Background
The sremska-school-site is a static site built with Eleventy (11ty). Currently, it supports deployment to:
- Netlify (via `netlify.toml`)
- Vercel (via `vercel.json`)
- GitHub Pages (via sample workflow)

To gain more control over infrastructure, reduce vendor lock-in, and align with the deployment approach used in `gnomik-app/gnomik-landing`, we want to enable deployment to a VPS using [Kamal](https://kamal-deploy.org/).

### Goals
1. Enable one-command deployment to a VPS using Kamal
2. Automate deployments via GitHub Actions on push to `main`
3. Serve static content via Nginx with SSL termination via Kamal's built-in Traefik proxy
4. Maintain security best practices for secrets, SSH keys, and container registry authentication

---

## High-Level Approach

### 1. Container Strategy

Since this is a static site, the build step happens **before** Docker image creation (via CI or locally). The Dockerfile simply:
- Uses `nginx:alpine` for minimal image size
- Copies the pre-built `_site/` directory to Nginx's html directory
- This produces a minimal, secure production image (~20-30MB)

### 2. Kamal Configuration

Kamal uses a `config/deploy.yml` file for deployment configuration. Key components:

```yaml
# config/deploy.yml
service: sremska-school

image: <registry>/sremska-school-site

servers:
  web:
    hosts:
      - <VPS_IP_ADDRESS>
    labels:
      traefik.http.routers.sremska-school.rule: Host(`sremska.school`)
      traefik.http.routers.sremska-school-secure.entrypoints: websecure
      traefik.http.routers.sremska-school-secure.rule: Host(`sremska.school`)
      traefik.http.routers.sremska-school-secure.tls: true
      traefik.http.routers.sremska-school-secure.tls.certresolver: letsencrypt

registry:
  server: ghcr.io
  username:
    - KAMAL_REGISTRY_USERNAME
  password:
    - KAMAL_REGISTRY_PASSWORD

ssh:
  user: deploy
  
builder:
  multiarch: false

traefik:
  options:
    publish:
      - "443:443"
    volume:
      - "/letsencrypt/acme.json:/letsencrypt/acme.json"
  args:
    entryPoints.web.address: ":80"
    entryPoints.websecure.address: ":443"
    entryPoints.web.http.redirections.entryPoint.to: websecure
    entryPoints.web.http.redirections.entryPoint.scheme: https
    certificatesResolvers.letsencrypt.acme.email: admin@sremska.school
    certificatesResolvers.letsencrypt.acme.storage: /letsencrypt/acme.json
    certificatesResolvers.letsencrypt.acme.httpchallenge: true
    certificatesResolvers.letsencrypt.acme.httpchallenge.entrypoint: web
```

### 3. Secrets Management

Create `.kamal/secrets` (gitignored) and `.kamal/secrets-example` (committed):

```bash
# .kamal/secrets-example
# Copy this to .kamal/secrets and fill in real values

KAMAL_REGISTRY_USERNAME=your-github-username
KAMAL_REGISTRY_PASSWORD=ghp_your-github-pat-token

# SSH key path (optional, defaults to ~/.ssh/id_rsa)
# SSH_KEY_PATH=~/.ssh/deploy_key
```

### 4. Dockerfile

```dockerfile
# Dockerfile

# Use nginx:alpine for minimal image size
FROM nginx:alpine

LABEL service="sremska-school"

# Copy built site to nginx html directory
COPY _site/ /usr/share/nginx/html/

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 5. Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml application/rss+xml image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML files - short cache for updates
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Handle trailing slashes and clean URLs
    location / {
        try_files $uri $uri/ $uri.html =404;
    }

    # Custom error pages
    error_page 404 /404.html;
}
```

### 6. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches:
      - main
  workflow_dispatch:

env:
  VPS_HOST: your-vps-ip-or-hostname

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies and build
        run: |
          npm ci
          npm run build

      - name: Set up Ruby (for Kamal)
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install Kamal
        run: gem install kamal

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          chmod 700 ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ env.VPS_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy with Kamal
        env:
          KAMAL_REGISTRY_PASSWORD: ${{ secrets.GHCR_TOKEN }}
        run: kamal deploy
```

---

## Required Files

### New Files to Create

| File | Purpose |
|------|---------|
| `Dockerfile` | Nginx Alpine serving pre-built `_site/` |
| `nginx.conf` | Nginx configuration for static site serving |
| `config/deploy.yml` | Kamal deployment configuration |
| `.kamal/secrets-example` | Template for local secrets |
| `.github/workflows/deploy.yml` | GitHub Actions workflow for automated deployment |

### Files to Update

| File | Change |
|------|--------|
| `.gitignore` | Add `.kamal/secrets` |

---

## Required GitHub Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

| Secret Name | Description |
|-------------|-------------|
| `SSH_PRIVATE_KEY` | SSH private key for VPS access (deploy user) |
| `GHCR_TOKEN` | GitHub Container Registry token (Personal Access Token with `write:packages` scope) |

Note: `VPS_HOST` is configured as an environment variable in the workflow file, not as a secret.

---

## Server Preparation Checklist

Before first deployment, the VPS must be configured:

1. **Create deploy user**
   ```bash
   adduser deploy
   usermod -aG docker deploy
   ```
   > **Note:** After running `usermod -aG docker deploy`, the `deploy` user must log out and back in, or run `newgrp docker`, for the group membership change to take effect.

2. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   systemctl enable docker
   systemctl start docker
   ```

3. **Configure SSH access**
   - Add deploy user's public key to `/home/deploy/.ssh/authorized_keys`
   - Ensure SSH port (22) is accessible

4. **Open firewall ports**
   ```bash
   ufw allow 22    # SSH
   ufw allow 80    # HTTP (for Let's Encrypt challenges)
   ufw allow 443   # HTTPS
   ufw enable
   ```

5. **Create Let's Encrypt storage**
   ```bash
   mkdir -p /letsencrypt
   touch /letsencrypt/acme.json
   chmod 600 /letsencrypt/acme.json
   ```

6. **DNS Configuration**
   - Point `sremska.school` (or your domain) A record to VPS IP

---

## Deployment Commands

### Local Development/Testing

```bash
# Install Kamal (requires Ruby)
gem install kamal

# Copy and fill secrets
cp .kamal/secrets-example .kamal/secrets
# Edit .kamal/secrets with real values

# First-time server setup
kamal setup

# Deploy
kamal deploy

# View logs
kamal app logs

# Rollback
kamal rollback

# SSH into container
kamal app exec -i -t bash
```

### GitHub Actions (Automated)

Push to `main` branch triggers automatic deployment via GitHub Actions workflow.

---

## Verification Checklist

After implementation, verify:

- [ ] `docker build -t test .` succeeds locally
- [ ] Container serves site correctly: `docker run -p 8080:80 test` → visit http://localhost:8080
- [ ] `kamal setup` completes without errors (first-time only)
- [ ] `kamal deploy` completes successfully
- [ ] Site is accessible at https://sremska.school (or configured domain)
- [ ] SSL certificate is valid and auto-renewing
- [ ] GitHub Actions workflow runs on push to `main`
- [ ] Rollback works: `kamal rollback`

---

## Security Notes

1. **Never commit secrets**: `.kamal/secrets` must be in `.gitignore`
2. **Use deploy-specific SSH key**: Generate a dedicated key pair for deployments
3. **Limit deploy user permissions**: Only Docker access, no sudo
4. **Container runs as non-root**: Nginx Alpine runs as nginx user by default
5. **Minimal attack surface**: Final image contains only Nginx + static files
6. **Automated updates**: Consider adding Dependabot for Dockerfile base images

---

## Implementation Checklist

- [ ] Create `Dockerfile` (Nginx Alpine serving pre-built `_site/`)
- [ ] Create `nginx.conf` with optimized static file serving
- [ ] Create `config/deploy.yml` with Kamal configuration
- [ ] Create `.kamal/secrets-example` with template
- [ ] Update `.gitignore` to exclude `.kamal/secrets`
- [ ] Create `.github/workflows/deploy.yml` for automated deployment
- [ ] Test Docker build locally
- [ ] Prepare VPS (Docker, deploy user, firewall, Let's Encrypt storage)
- [ ] Configure DNS records
- [ ] Add GitHub secrets (`SSH_PRIVATE_KEY`, `GHCR_TOKEN`)
- [ ] Configure `VPS_HOST` environment variable in workflow
- [ ] Run first deployment with `kamal setup`
- [ ] Verify site accessibility and SSL

---

## References

- [Kamal Documentation](https://kamal-deploy.org/)
- [Kamal GitHub Repository](https://github.com/basecamp/kamal)
- [gnomik-app/gnomik-landing](https://github.com/gnomik-app/gnomik-landing) - Reference implementation
- [Traefik Let's Encrypt](https://doc.traefik.io/traefik/https/acme/)
- [Nginx Static Files Optimization](https://nginx.org/en/docs/http/ngx_http_core_module.html)
