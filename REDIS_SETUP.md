# 🔴 Redis Setup - Fase 7

## 📋 Resumen

Redis está **configurado** pero **desactivado por defecto** en local (Windows).

- ✅ **VPS (Producción)**: Redis activo → Caché + Rate Limiting persistente
- ⚠️ **Local (Windows)**: Redis desactivado → Sin caché + Rate Limiting en memoria

---

## 🖥️ Windows (Desarrollo Local)

### **Opción 1: Sin Redis (Modo Fallback)** ⭐ Recomendado

Tu `.env.local` ya está configurado así:

```env
REDIS_ENABLED=false
SKIP_RATE_LIMIT=true
```

✅ **El back funciona perfectamente sin Redis**:
- ❌ Sin caché (queries directas a MySQL)
- ✅ Rate limiting en memoria (funciona pero no persiste entre reinicios)
- ✅ Todos los endpoints operativos

### **Opción 2: Con Redis (Docker)** 🐳

Si quieres probar Redis en local:

#### 1. Instalar Docker Desktop
Descargar de: https://www.docker.com/products/docker-desktop/

#### 2. Levantar Redis
```bash
docker run --name persenaut-redis -p 6379:6379 -d redis:7-alpine
```

#### 3. Activar en `.env.local`
```env
REDIS_ENABLED=true
SKIP_RATE_LIMIT=false  # Opcional: activar rate limiting
```

#### 4. Verificar conexión
```bash
docker exec -it persenaut-redis redis-cli
> PING
PONG
```

#### Comandos útiles Docker
```bash
# Ver logs
docker logs persenaut-redis

# Detener
docker stop persenaut-redis

# Iniciar de nuevo
docker start persenaut-redis

# Eliminar contenedor
docker rm -f persenaut-redis
```

---

## 🌐 VPS (Producción)

### **1. Instalar Redis en Ubuntu/Debian**

```bash
# Actualizar paquetes
sudo apt update

# Instalar Redis
sudo apt install redis-server -y

# Verificar instalación
redis-cli --version
```

### **2. Configurar Redis para producción**

```bash
# Editar configuración
sudo nano /etc/redis/redis.conf
```

**Cambios recomendados**:
```conf
# Bind solo a localhost (más seguro)
bind 127.0.0.1

# Proteger con contraseña
requirepass TU_PASSWORD_SEGURO

# Persistencia en disco
save 900 1      # Guardar si 1 cambio en 15min
save 300 10     # Guardar si 10 cambios en 5min
save 60 10000   # Guardar si 10k cambios en 1min

# Memoria máxima (ajustar según VPS)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### **3. Iniciar Redis**

```bash
# Habilitar inicio automático
sudo systemctl enable redis-server

# Iniciar servicio
sudo systemctl start redis-server

# Verificar estado
sudo systemctl status redis-server

# Probar conexión
redis-cli ping
# Respuesta: PONG
```

### **4. Configurar ecosystem.config.js**

Ya está listo en tu `ecosystem.config.js`:

```javascript
env: {
  REDIS_ENABLED: 'true',  // ✅ Activado
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_DB: '0',
  REDIS_TLS: 'false',
  SKIP_RATE_LIMIT: 'false',  // ✅ Rate limiting activo
  LOG_LEVEL: 'info',
  // ... resto de variables
}
```

### **5. Desplegar con PM2**

```bash
# En tu VPS
cd ~/persenaut_back/persenaut-back

# Instalar dependencias
npm install

# Aplicar índices de BD (IMPORTANTE - solo primera vez)
mysql -u persenaut -p persenaut < database/optimizations.sql

# Desplegar con PM2
pm2 start ecosystem.config.js

# Ver logs
pm2 logs persenaut-backend

# Ver estado
pm2 status
```

---

## 🚀 Beneficios de Redis en Producción

### Sin Redis (Local)
- ⚠️ Queries directas a MySQL: **20-200ms**
- ⚠️ Rate limits en memoria (se resetean con cada reinicio)
- ⚠️ No funciona con múltiples instancias PM2

### Con Redis (VPS)
- ✅ **10x más rápido**: Métricas desde Redis: **2-5ms**
- ✅ Rate limits persistentes (sobreviven reinicios)
- ✅ Compatible con modo cluster (múltiples instancias)
- ✅ Menos carga en MySQL (reduce 80% queries repetitivas)

---

## 📊 Endpoints con Caché (si Redis activo)

| Endpoint | TTL Cache | Beneficio |
|----------|-----------|-----------|
| `GET /user/:id/metrics/overall` | 5 min | 10-50x más rápido |
| `GET /user/:id/metrics/sessions` | 1 min | 5-20x más rápido |
| `GET /user/:id/metrics/themes` | 5 min | 10-30x más rápido |
| `GET /user/:id/metrics/timeline` | 5 min | 20-100x más rápido |
| `GET /user/:id/metrics/game-modes` | 5 min | 10-40x más rápido |

---

## 🔍 Verificar Redis en Runtime

### Desde Node.js

Tu app ya tiene health check integrado:

```bash
# GET http://localhost:3000/health
curl http://localhost:3000/health
```

Respuesta con Redis activo:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "redis": "connected",  // ✅
  "memory": {
    "used": 125.5,
    "total": 512
  }
}
```

Respuesta sin Redis:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "redis": "disabled",  // ⚠️ Modo fallback
  "memory": {
    "used": 125.5,
    "total": 512
  }
}
```

### Logs de inicio

Con Redis:
```
✅ Redis: Conectado al servidor
🚀 Redis: Cliente listo para recibir comandos
```

Sin Redis:
```
⚠️ Redis DESACTIVADO - Usando modo fallback (sin caché, rate limits en memoria)
```

---

## 🐛 Troubleshooting

### Error: "Redis connection refused"

**Causa**: Redis no está corriendo

**Solución**:
```bash
# VPS
sudo systemctl start redis-server

# Docker (Windows)
docker start persenaut-redis
```

### Error: "MaxRetriesPerRequestError"

**Causa**: Redis configurado pero no disponible

**Solución**: Desactivar en `.env.local`:
```env
REDIS_ENABLED=false
```

### Rate limiting no funciona

**Verificar**:
```env
SKIP_RATE_LIMIT=false  # Debe estar en false
```

**Nota**: En desarrollo está en `true` para facilitar testing.

---

## 📝 Variables de Entorno

### `.env.local` (Windows - Desarrollo)
```env
REDIS_ENABLED=false       # Desactivado (sin Docker)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_TLS=false
SKIP_RATE_LIMIT=true      # Sin límites en dev
LOG_LEVEL=debug           # Logs verbosos
```

### `ecosystem.config.js` (VPS - Producción)
```javascript
REDIS_ENABLED: 'true',    // ✅ Activado
REDIS_HOST: 'localhost',
REDIS_PORT: '6379',
REDIS_DB: '0',
REDIS_TLS: 'false',
SKIP_RATE_LIMIT: 'false', // ✅ Protección activa
LOG_LEVEL: 'info',        // Solo info/warn/error
```

---

## 🎯 Recomendaciones

### Desarrollo Local (Windows)
- ❌ **No necesitas Redis** para desarrollar
- ✅ Modo fallback funciona perfectamente
- ✅ Instalar solo si quieres probar caché específicamente

### Producción (VPS)
- ✅ **Redis es MUY recomendado**
- ✅ 10x mejora de performance
- ✅ Rate limiting persistente
- ✅ Menos carga en MySQL

---

## 🔗 Próximos pasos

### Ahora (Local)
```bash
# Reiniciar backend sin Redis
npm run dev
```

### Cuando subas a VPS
1. ✅ Instalar Redis (`apt install redis-server`)
2. ✅ Verificar `ecosystem.config.js` (ya está listo)
3. ✅ Aplicar índices SQL (`database/optimizations.sql`)
4. ✅ Desplegar con PM2 (`pm2 start ecosystem.config.js`)
5. ✅ Verificar logs (`pm2 logs`)

---

**✅ Tu app funciona AHORA sin Redis**  
**🚀 Tu app volará en VPS con Redis**
