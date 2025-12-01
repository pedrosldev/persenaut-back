# 🚀 Fase 9: CI/CD para Persenaut (Repos separados)

## 🎯 Objetivo

Automatizar el deployment de **backend** (Node.js + PM2) y **frontend** (React + build estático) en tu VPS de Clouding.

**Situación actual:**
```bash
# Backend (manual)
ssh vps
cd ~/persenaut_back/persenaut-back
git pull origin main
pm2 restart persenaut-backend

# Frontend (manual)
ssh vps
cd ~/persenaut_front
git pull origin main
npm run build
# Copiar build/ a directorio web
```

**Con CI/CD:**
```bash
git push origin main
# ✅ Auto-deploy backend (tests, migraciones, restart PM2)
# ✅ Auto-deploy frontend (build, copiar a web)
# ✅ Notificaciones si algo falla
```

---

## 📊 Arquitectura recomendada

### Opción 1: **GitHub Actions** (Recomendado para ti)

**Por qué:**
- ✅ Gratis para repos públicos (2,000 min/mes privados)
- ✅ Se integra nativamente con GitHub
- ✅ Fácil configuración con SSH
- ✅ Secretos seguros (env variables)
- ✅ Logs detallados en GitHub UI

**Flujo:**
```
┌─────────────────┐
│  git push main  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   GitHub Actions Runner     │
│  (Servidor de GitHub)       │
│                             │
│  1. Checkout código         │
│  2. Instalar dependencias   │
│  3. Tests (opcional)        │
│  4. SSH a VPS               │
│  5. git pull en VPS         │
│  6. Ejecutar scripts        │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   VPS Clouding              │
│                             │
│  Backend: PM2 restart       │
│  Frontend: npm run build    │
└─────────────────────────────┘
```

### Opción 2: **Webhooks + Script manual**

**Por qué:**
- ✅ No depende de GitHub Actions
- ✅ Control total en tu VPS
- ❌ Más setup inicial (nginx, endpoint)

### Opción 3: **Jenkins/GitLab CI**

**Por qué:**
- ❌ Overkill para proyectos pequeños
- ❌ Requiere servidor dedicado

**Recomendación:** Usa **GitHub Actions** por simplicidad.

---

## 🛠️ Implementación: GitHub Actions

### 🔧 Prerequisitos en el VPS

#### 1. Crear usuario deployment (seguridad)

```bash
# Como root en VPS
sudo adduser deploy
sudo usermod -aG sudo deploy

# Configurar PM2 para usuario deploy
su - deploy
pm2 startup
# Copiar comando que genera y ejecutarlo con sudo
```

#### 2. Generar clave SSH para CI/CD

```bash
# En tu PC local (Windows)
ssh-keygen -t ed25519 -C "github-actions-persenaut" -f ~/.ssh/persenaut_deploy

# Esto genera:
# ~/.ssh/persenaut_deploy (clave privada) ← Guardar en GitHub Secrets
# ~/.ssh/persenaut_deploy.pub (clave pública) ← Añadir a VPS
```

#### 3. Añadir clave pública al VPS

```bash
# Copiar contenido de persenaut_deploy.pub
cat ~/.ssh/persenaut_deploy.pub

# En el VPS como usuario deploy
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Pegar la clave pública
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### 4. Probar conexión SSH

```bash
# Desde tu PC
ssh -i ~/.ssh/persenaut_deploy deploy@TU_IP_VPS

# Si conecta sin pedir contraseña ✅
```

#### 5. Configurar PM2 ecosystem

```bash
# En VPS: ~/persenaut_back/persenaut-back/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'persenaut-backend',
    script: './app.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      REDIS_ENABLED: 'true',
      // ... resto de variables
    },
    // Auto-restart después de deployment
    wait_ready: true,
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
```

---

## 📝 Backend: Workflow CI/CD

### 1. Crear archivo de workflow

En tu repo `persenaut-back`:

```bash
mkdir -p .github/workflows
touch .github/workflows/deploy-production.yml
```

### 2. Configurar workflow

```yaml
# .github/workflows/deploy-production.yml

name: Deploy Backend to VPS

on:
  push:
    branches:
      - main  # Se ejecuta solo en push a main

  # Opcional: deployment manual
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout código
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 3. Instalar dependencias (para tests)
      - name: Install dependencies
        run: npm ci

      # 4. [OPCIONAL] Tests
      - name: Run tests
        run: npm test
        continue-on-error: true  # No bloquear si no hay tests

      # 5. [OPCIONAL] Linter
      - name: Run linter
        run: npm run lint
        continue-on-error: true

      # 6. Configurar SSH
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}

      # 7. Añadir VPS a known_hosts (evitar prompt)
      - name: Add VPS to known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      # 8. Deploy al VPS
      - name: Deploy to VPS
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_PATH: ${{ secrets.VPS_BACKEND_PATH }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            set -e  # Exit on error
            
            echo "📂 Navigating to backend directory..."
            cd ${{ secrets.VPS_BACKEND_PATH }}
            
            echo "🔄 Pulling latest changes..."
            git pull origin main
            
            echo "📦 Installing dependencies..."
            npm ci --only=production
            
            echo "🗄️ Running database migrations..."
            NODE_ENV=production npx knex migrate:latest --env production
            
            echo "♻️ Restarting PM2..."
            pm2 restart ecosystem.config.js --env production
            
            echo "✅ Deployment completed!"
            pm2 status
          ENDSSH

      # 9. Health check
      - name: Health check
        run: |
          sleep 5  # Esperar a que PM2 inicie
          response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ secrets.VPS_HOST }}/health)
          if [ $response -eq 200 ]; then
            echo "✅ Health check passed"
          else
            echo "❌ Health check failed (HTTP $response)"
            exit 1
          fi

      # 10. Notificación (opcional)
      - name: Notify success
        if: success()
        run: echo "🎉 Backend deployed successfully!"

      - name: Notify failure
        if: failure()
        run: echo "❌ Deployment failed. Check logs."
```

### 3. Configurar Secrets en GitHub

Ve a tu repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Añade:

| Secret Name | Valor | Ejemplo |
|------------|-------|---------|
| `VPS_SSH_PRIVATE_KEY` | Contenido de `~/.ssh/persenaut_deploy` | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `VPS_HOST` | IP o dominio del VPS | `123.45.67.89` o `api.persenaut.com` |
| `VPS_USER` | Usuario SSH | `deploy` |
| `VPS_BACKEND_PATH` | Path absoluto al backend | `/home/deploy/persenaut_back/persenaut-back` |

**⚠️ IMPORTANTE:** Copia la clave privada COMPLETA, incluyendo:
```
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

### 4. Test deployment

```bash
git add .github/workflows/deploy-production.yml
git commit -m "ci: add GitHub Actions workflow for backend"
git push origin main
```

Ve a GitHub → **Actions** → Verás el workflow ejecutándose.

---

## 🎨 Frontend: Workflow CI/CD

### 1. Crear workflow en repo `persenaut_front`

```bash
mkdir -p .github/workflows
touch .github/workflows/deploy-production.yml
```

### 2. Configurar workflow

```yaml
# .github/workflows/deploy-production.yml

name: Deploy Frontend to VPS

on:
  push:
    branches:
      - main

  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout código
      - name: Checkout code
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 3. Instalar dependencias
      - name: Install dependencies
        run: npm ci

      # 4. [OPCIONAL] Tests
      - name: Run tests
        run: npm test
        continue-on-error: true

      # 5. Build producción
      - name: Build production
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          # Añade todas tus variables de entorno de Vite
        run: npm run build

      # 6. Configurar SSH
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.VPS_SSH_PRIVATE_KEY }}

      # 7. Añadir VPS a known_hosts
      - name: Add VPS to known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      # 8. Comprimir build
      - name: Compress build
        run: tar -czf dist.tar.gz -C dist .

      # 9. Copiar build al VPS
      - name: Copy build to VPS
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
        run: |
          scp dist.tar.gz $VPS_USER@$VPS_HOST:/tmp/persenaut-frontend.tar.gz

      # 10. Extraer y mover build
      - name: Deploy build
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_WEB_PATH: ${{ secrets.VPS_FRONTEND_PATH }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            set -e
            
            echo "📂 Backing up current build..."
            if [ -d ${{ secrets.VPS_FRONTEND_PATH }} ]; then
              mv ${{ secrets.VPS_FRONTEND_PATH }} ${{ secrets.VPS_FRONTEND_PATH }}.backup_$(date +%Y%m%d_%H%M%S)
            fi
            
            echo "📦 Extracting new build..."
            mkdir -p ${{ secrets.VPS_FRONTEND_PATH }}
            tar -xzf /tmp/persenaut-frontend.tar.gz -C ${{ secrets.VPS_FRONTEND_PATH }}
            
            echo "🧹 Cleaning up..."
            rm /tmp/persenaut-frontend.tar.gz
            
            echo "✅ Frontend deployed!"
            ls -lh ${{ secrets.VPS_FRONTEND_PATH }}
          ENDSSH

      # 11. Health check
      - name: Health check
        run: |
          sleep 3
          response=$(curl -s -o /dev/null -w "%{http_code}" https://${{ secrets.VPS_DOMAIN }})
          if [ $response -eq 200 ]; then
            echo "✅ Frontend is live"
          else
            echo "❌ Frontend health check failed (HTTP $response)"
            exit 1
          fi

      # 12. Limpiar backups antiguos (retener últimos 5)
      - name: Clean old backups
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_WEB_PATH: ${{ secrets.VPS_FRONTEND_PATH }}
        run: |
          ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
            cd $(dirname ${{ secrets.VPS_FRONTEND_PATH }})
            ls -dt persenaut-frontend.backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf
          ENDSSH
```

### 3. Configurar Secrets (Frontend)

| Secret Name | Valor | Ejemplo |
|------------|-------|---------|
| `VPS_SSH_PRIVATE_KEY` | Misma clave que backend | (ya la tienes) |
| `VPS_HOST` | IP del VPS | `123.45.67.89` |
| `VPS_USER` | Usuario SSH | `deploy` |
| `VPS_FRONTEND_PATH` | Path donde se sirve React | `/var/www/persenaut` |
| `VPS_DOMAIN` | Dominio frontend | `https://www.persenaut.piterxus.com` |
| `VITE_API_URL` | URL de tu API | `https://api.persenaut.com` |

### 4. Test deployment

```bash
git add .github/workflows/deploy-production.yml
git commit -m "ci: add GitHub Actions workflow for frontend"
git push origin main
```

---

## 🔒 Seguridad

### 1. Limitar acceso SSH por IP (opcional)

```bash
# En VPS: /etc/ssh/sshd_config
Match User deploy
    AllowUsers deploy@GITHUB_RUNNER_IP
```

### 2. Usar deploy keys por repo

En vez de una sola clave para todo:

```bash
# Generar clave específica para backend
ssh-keygen -t ed25519 -f ~/.ssh/persenaut_backend_deploy

# Generar clave específica para frontend
ssh-keygen -t ed25519 -f ~/.ssh/persenaut_frontend_deploy
```

### 3. Variables de entorno en VPS

**❌ NO hacer:**
```yaml
# Hardcodear credenciales en workflow
run: MYSQL_PASSWORD=supersecret npm start
```

**✅ Hacer:**
```bash
# En VPS: crear .env en cada proyecto
cd ~/persenaut_back/persenaut-back
nano .env  # Con todas las variables de producción

# En ecosystem.config.js
env_production: {
  NODE_ENV: 'production',
  // Leer de .env automáticamente
}
```

### 4. Rollback automático si falla health check

```yaml
- name: Health check with rollback
  run: |
    response=$(curl -s -o /dev/null -w "%{http_code}" https://api.persenaut.com/health)
    if [ $response -ne 200 ]; then
      ssh $VPS_USER@$VPS_HOST "pm2 restart ecosystem.config.js --env production"
      exit 1
    fi
```

---

## 📊 Monitoring y Notificaciones

### 1. Notificaciones Discord/Slack

```yaml
# Al final del workflow
- name: Notify Discord
  if: always()
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
    status: ${{ job.status }}
    title: "Backend Deployment"
    description: |
      Commit: ${{ github.event.head_commit.message }}
      Author: ${{ github.actor }}
```

### 2. Logs en GitHub Actions

```yaml
- name: Save deployment logs
  if: always()
  run: |
    ssh $VPS_USER@$VPS_HOST "pm2 logs persenaut-backend --lines 50 --nostream" > deployment.log

- name: Upload logs
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: deployment-logs
    path: deployment.log
```

### 3. Métricas de deployment

```yaml
- name: Deployment metrics
  run: |
    echo "⏱️ Deployment time: ${{ steps.deploy.outputs.time }}s"
    echo "📦 Build size: $(du -sh dist | cut -f1)"
    echo "🔢 Commit: ${{ github.sha }}"
```

---

## 🚨 Troubleshooting

### Error: "Permission denied (publickey)"

```bash
# Verificar que la clave está en authorized_keys
ssh $VPS_USER@$VPS_HOST "cat ~/.ssh/authorized_keys"

# Verificar permisos
ssh $VPS_USER@$VPS_HOST "ls -la ~/.ssh"
# Debe ser: drwx------ (700) para .ssh
#           -rw------- (600) para authorized_keys
```

### Error: "PM2 not found"

```bash
# En VPS, asegúrate de que PM2 está en PATH del usuario deploy
su - deploy
which pm2  # Debe mostrar /home/deploy/.nvm/versions/node/vXX/bin/pm2

# Si no aparece, añadir a ~/.bashrc
echo 'export PATH="$HOME/.nvm/versions/node/v20.x.x/bin:$PATH"' >> ~/.bashrc
```

### Error: "Health check failed"

```bash
# Verificar que el endpoint /health existe
curl https://api.persenaut.com/health

# Verificar logs de PM2
pm2 logs persenaut-backend --lines 100

# Verificar que el puerto está abierto
sudo netstat -tulpn | grep 3000
```

### Workflow se queda "Running" indefinidamente

```bash
# Añadir timeout a los jobs
jobs:
  deploy:
    timeout-minutes: 10  # Cancelar después de 10 minutos
```

---

## 🎯 Workflow de desarrollo completo

### Branch protection rules

GitHub → Repo → **Settings** → **Branches** → **Add rule**

- Branch name pattern: `main`
- ☑️ Require status checks to pass before merging
- ☑️ Require branches to be up to date before merging
- ☑️ Require deployments to succeed before merging

### Feature branch workflow

```bash
# 1. Crear feature branch
git checkout -b feature/new-endpoint

# 2. Desarrollar + commit
git add .
git commit -m "feat(api): add new endpoint"

# 3. Push a GitHub
git push origin feature/new-endpoint

# 4. Crear Pull Request en GitHub
# GitHub Actions ejecuta tests (no deploy)

# 5. Merge to main (después de review)
# GitHub Actions ejecuta tests + deploy automático a VPS

# 6. Verificar deployment
# Ve a Actions → Verifica que el workflow pasó ✅
```

---

## 📋 Checklist de implementación

### Backend CI/CD

- [ ] Crear usuario `deploy` en VPS
- [ ] Generar par de claves SSH
- [ ] Añadir clave pública a `~/.ssh/authorized_keys` en VPS
- [ ] Probar conexión SSH desde local
- [ ] Crear `.github/workflows/deploy-production.yml`
- [ ] Añadir secrets en GitHub:
  - [ ] `VPS_SSH_PRIVATE_KEY`
  - [ ] `VPS_HOST`
  - [ ] `VPS_USER`
  - [ ] `VPS_BACKEND_PATH`
- [ ] Commit y push del workflow
- [ ] Verificar en GitHub Actions que el deployment funciona
- [ ] Probar rollback manual
- [ ] Configurar notificaciones (opcional)

### Frontend CI/CD

- [ ] Usar misma clave SSH que backend (o crear nueva)
- [ ] Crear `.github/workflows/deploy-production.yml`
- [ ] Añadir secrets en GitHub:
  - [ ] `VPS_SSH_PRIVATE_KEY`
  - [ ] `VPS_HOST`
  - [ ] `VPS_USER`
  - [ ] `VPS_FRONTEND_PATH`
  - [ ] `VPS_DOMAIN`
  - [ ] `VITE_API_URL`
- [ ] Commit y push del workflow
- [ ] Verificar en GitHub Actions que el build y deployment funcionan
- [ ] Probar rollback (restaurar backup)
- [ ] Configurar limpieza de backups antiguos

### Post-implementación

- [ ] Documentar proceso en README.md
- [ ] Configurar branch protection rules
- [ ] Crear workflow para staging (opcional)
- [ ] Añadir tests al workflow (cuando los tengas)
- [ ] Configurar monitoring (Discord/Slack)
- [ ] Probar deployment desde Pull Request

---

## 🎉 Beneficios después de CI/CD

**Antes:**
```
❌ SSH manual cada vez
❌ Olvidar correr migraciones
❌ PM2 restart olvidado = downtime
❌ Build de frontend inconsistente
❌ No hay registro de deployments
❌ Errores descubiertos en producción
```

**Después:**
```
✅ git push → Auto-deploy
✅ Migraciones automáticas
✅ Tests antes de deploy
✅ Health checks automáticos
✅ Logs en GitHub
✅ Rollback rápido
✅ Notificaciones si algo falla
✅ Zero-downtime deployments
```

---

## 🚀 Siguientes pasos (Fase 10+)

Una vez domines CI/CD básico:

1. **Staging environment**: Crear entorno de pruebas separado
2. **Blue-Green deployments**: Zero downtime garantizado
3. **Canary releases**: Deploy gradual (1% → 10% → 100%)
4. **Docker**: Containerizar backend y frontend
5. **Kubernetes**: Si creces mucho (overkill por ahora)
6. **Terraform**: Infraestructura como código
7. **Monitoring**: Sentry, DataDog, New Relic

---

**🎯 Fase 9 = git push = Production deployment automático** ✅

**Tiempo estimado de setup:** 2-3 horas
**Ahorro de tiempo a futuro:** 10-15 minutos por deployment
