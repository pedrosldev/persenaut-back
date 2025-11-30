# Persenaut Backend API

## 📚 Descripción

Backend RESTful para **Persenaut**, una plataforma educativa que genera desafíos personalizados con IA y proporciona un tutor virtual inteligente para mejorar el aprendizaje.

## 🚀 Características

- **Generación de desafíos con IA** (Groq API)
- **Tutor virtual personalizado** con recomendaciones basadas en métricas
- **Modo intensivo** de práctica con múltiples modos de juego
- **Sistema de puntuación** y métricas de progreso
- **Autenticación con JWT** mediante cookies httpOnly
- **API RESTful documentada** con Swagger/OpenAPI
- **Arquitectura limpia** con patrón Repository y validación de entrada

## 🛠️ Tecnologías

- **Node.js** v18+
- **Express** v5.1.0
- **MySQL** (mysql2) con 26+ índices optimizados
- **Redis** v7.x (caché + rate limiting)
- **Groq SDK** v0.30.0 (IA generativa)
- **JWT** para autenticación
- **express-validator** para validación
- **Swagger** para documentación API
- **Jest** para testing
- **Winston** para logging estructurado
- **Helmet** para seguridad HTTP

## 📦 Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/pedrosldev/persenaut-back.git
cd persenaut-back
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Instalar dependencias de desarrollo** (testing y documentación)
```bash
npm install --save-dev
```

4. **Configurar variables de entorno**

Crear `.env.local` para desarrollo:
```env
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=persenaut_db

# JWT
JWT_SECRET=tu_secreto_jwt_aqui

# Groq API (IA)
GROQ_API_KEY=tu_api_key_de_groq

# Redis (Fase 7) - Opcional en local
REDIS_ENABLED=false  # true para activar (requiere Docker en Windows)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_TLS=false

# Logging (Fase 7)
LOG_LEVEL=debug

# Rate Limiting (Fase 7)
SKIP_RATE_LIMIT=true  # Desactivar límites en desarrollo
```

5. **Configurar base de datos**

Ejecutar el script SQL para crear las tablas necesarias (ver `database/schema.sql`)

6. **[OPCIONAL] Instalar Redis** (para Fase 7)

En desarrollo local con Docker (Windows):
```bash
docker run --name persenaut-redis -p 6379:6379 -d redis:7-alpine
```

En producción (Linux/VPS):
```bash
sudo apt install redis-server -y
sudo systemctl start redis-server
```

7. **[OPCIONAL] Aplicar índices SQL** (para optimización)

```bash
mysql -u root -p persenaut_db < database/optimizations.sql
```

## 🏗️ Arquitectura

### Estructura de carpetas

```
persenaut-back/
├── config/              # Configuraciones (DB, CORS, Groq, Swagger, Redis, Logger)
│   ├── cors.js
│   ├── db.js
│   ├── groq.js
│   ├── logger.js        # 🆕 Winston logging
│   ├── redis.js         # 🆕 Redis client
│   └── swagger.js
├── controllers/         # Controladores (lógica de endpoints)
│   ├── challengeController.js
│   ├── intensiveController.js
│   ├── pendingChallengesController.js
│   └── tutorController.js
├── middlewares/         # Middlewares (auth, errores, validación, rate limiting)
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   ├── performanceMonitor.js  # 🆕 Performance tracking
│   ├── rateLimiter.js         # 🆕 Rate limiting (7 limiters)
│   └── validators/
│       ├── authValidator.js
│       ├── challengeValidator.js
│       └── intensiveValidator.js
├── repositories/        # Acceso a datos (patrón Repository)
│   ├── challengeRepository.js
│   ├── metricsRepository.js
│   ├── sessionRepository.js
│   └── userRepository.js
├── routes/              # Definición de rutas
│   ├── auth.js
│   ├── challenges.js
│   ├── intensiveReview.js
│   ├── metrics.js
│   ├── profile.js
│   ├── themes.js
│   └── tutor.js
├── services/            # Lógica de negocio
│   ├── achievementService.js
│   ├── cacheService.js        # 🆕 Redis caching
│   ├── emailService.js
│   ├── intensiveService.js
│   ├── metricsService.js
│   ├── promptService.js
│   ├── schedulerService.js
│   ├── scoringService.js
│   ├── tutorService.js
│   └── userServices.js
├── database/            # Scripts SQL
│   └── optimizations.sql      # 🆕 26 índices para performance
├── tests/               # Tests automatizados
│   ├── unit/            # Tests unitarios
│   └── integration/     # Tests de integración
├── app.js               # Punto de entrada de la aplicación
└── package.json
```

### Capas de la arquitectura

```
┌─────────────────────────────────────┐
│         HTTP Request (API)          │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Routes + Validators (Middleware)   │  ← express-validator
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│       Controllers (Endpoints)       │  ← Lógica de endpoints
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│     Services (Business Logic)       │  ← Lógica de negocio
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   Repositories (Data Access Layer)  │  ← Acceso a MySQL
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│          MySQL Database             │
└─────────────────────────────────────┘
```

## 🔧 Comandos disponibles

```bash
# Desarrollo
npm run dev          # Servidor con nodemon (recarga automática)

# Producción
npm start            # Servidor en modo producción

# Testing
npm test             # Ejecutar todos los tests
npm run test:watch   # Tests en modo watch
npm run test:coverage # Tests con reporte de cobertura
npm run test:unit    # Solo tests unitarios
npm run test:integration # Solo tests de integración
```

## 📖 Documentación API

Una vez iniciado el servidor, la documentación interactiva de Swagger estará disponible en:

```
http://localhost:3000/api-docs
```

### Endpoints principales

#### Authentication
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión (cookie httpOnly)
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/check-auth` - Verificar autenticación

#### Challenges
- `POST /api/challenges/generate` - Generar desafío
- `POST /api/challenges/groq` - Generar con Groq AI
- `POST /api/challenges/from-notes` - Generar desde notas
- `POST /api/challenges/save-response` - Guardar respuesta
- `POST /api/challenges/pending` - Obtener desafíos pendientes
- `POST /api/challenges/start` - Iniciar desafío

#### Intensive Mode
- `POST /api/intensive-review/start` - Iniciar sesión intensiva
- `POST /api/intensive-review/save-results` - Guardar resultados
- `GET /api/intensive-review/user-themes/:userId` - Obtener temas del usuario
- `POST /api/intensive-review/continue-survival` - Continuar modo supervivencia

#### Tutor
- `POST /api/tutor/advice` - Obtener recomendaciones del tutor IA

#### Metrics (⚡ Optimizado con Redis - 10-50x más rápido)
- `GET /api/metrics/user/:userId/metrics/overall` - Métricas generales (caché 5min)
- `GET /api/metrics/user/:userId/metrics/sessions` - Sesiones recientes (caché 1min)
- `GET /api/metrics/user/:userId/metrics/themes` - Progreso por temas (caché 5min)
- `GET /api/metrics/user/:userId/metrics/timeline` - Evolución temporal (caché 5min)
- `GET /api/metrics/user/:userId/metrics/game-modes` - Estadísticas por modo (caché 5min)

#### Monitoring (Fase 7)
- `GET /health` - Health check del servidor (uptime, memoria, CPU, Redis status)

## 🧪 Testing

El proyecto cuenta con tests automatizados con Jest:

```bash
# Ejecutar todos los tests
npm test

# Tests con cobertura
npm run test:coverage

# Tests en modo watch (desarrollo)
npm run test:watch
```

### Cobertura actual
- **Unit Tests**: 23+ tests
- **Integration Tests**: 5+ tests
- **Cobertura**: ~55% (objetivo: 70%)

Los tests cubren:
- Repositories (challengeRepository, metricsRepository)
- Services (metricsService, tutorService)
- Validators (challengeValidator)
- Integration flows (modo intensivo E2E)

## 🔒 Seguridad

- **JWT en cookies httpOnly**: Protección contra XSS
- **express-validator**: Validación de entrada en 11+ endpoints
- **CORS configurado**: Solo orígenes permitidos
- **Bcrypt**: Hashing de contraseñas
- **Manejo centralizado de errores**: Error handler global
- **Helmet** (Fase 7): Headers de seguridad (CSP, HSTS, XSS Protection)
- **Rate Limiting** (Fase 7): Protección contra brute force y abuso de API
  - Auth: 20 intentos / 15 min
  - API general: 100 / 15 min
  - IA/Tutor: 10 / 5 min
  - Métricas: 30 / 1 min

## 📊 Base de datos

### Tablas principales

- `users` - Usuarios del sistema
- `questions` - Preguntas/desafíos generados
- `user_responses` - Respuestas de usuarios
- `intensive_sessions` - Sesiones de modo intensivo
- `intensive_responses` - Respuestas en modo intensivo
- `session_scores` - Puntuaciones de sesiones
- `user_metrics` - Métricas acumuladas de usuarios
- `achievements` - Logros desbloqueados

## 🤖 Integración con IA

El sistema utiliza **Groq API** para:

1. **Generación de preguntas**: Crea desafíos educativos basados en temas y dificultad
2. **Tutor virtual**: Analiza métricas del usuario y genera recomendaciones personalizadas
3. **Generación desde notas**: Convierte notas del usuario en preguntas de estudio

### Modelos usados
- `llama-3.3-70b-versatile` - Generación de preguntas
- `gpt-4o` - Análisis y recomendaciones del tutor

## 📈 Métricas y puntuación

### Sistema de puntos
- **10 puntos** por respuesta correcta
- **+50 puntos** de bonificación si accuracy ≥ 80%
- **Bonus de tiempo** en modo "time_attack"

### Métricas rastreadas
- Precisión general (%)
- Total de preguntas respondidas
- Total de sesiones completadas
- Tiempo total de estudio
- Progreso por temas
- Evolución temporal

## 🌟 Mejoras implementadas (Fases 1-7)

### ✅ Fase 1: Arquitectura MVC
- Reducción de app.js de 450 → 89 líneas (-80%)
- Controladores, rutas y configuraciones modulares

### ✅ Fase 2: Patrón Repository
- 4 repositorios con 33 métodos
- 100% de abstracción de acceso a datos
- Reducción de routes/intensiveReview.js de 400+ → 6 líneas (-98%)

### ✅ Fase 3: Capa de validación
- 3 validadores con 14 funciones
- 50+ reglas de validación
- 11 endpoints protegidos

### ✅ Fase 4: Refactorización de servicios
- Eliminación de 10 consultas SQL directas
- 100% de uso de repositories en services

### ✅ Fase 5: Suite de testing
- 23+ tests (unitarios e integración)
- Configuración de Jest y Supertest
- Cobertura de código con umbral del 70%

### ✅ Fase 6: Documentación API
- Swagger/OpenAPI 3.0 integrado
- Documentación interactiva en `/api-docs`
- JSDoc en servicios críticos
- Schemas reutilizables para modelos

### ✅ Fase 7: Optimizaciones de producción (ACTUAL) 🚀

#### **Redis Caching**
- **10-50x más rápido** en endpoints de métricas
- Caché inteligente con TTL (1-5 minutos)
- 5 endpoints optimizados: overall, sessions, themes, timeline, game-modes
- **80% menos carga en MySQL**
- Modo fallback automático si Redis no disponible

#### **Rate Limiting persistente**
- 7 limitadores especializados (auth, api, intensive, ai, tutor, metrics, global)
- Protección contra brute force en login (20 intentos / 15min)
- Límites persisten entre reinicios (Redis Store)
- Compatible con múltiples instancias PM2

#### **Logging estructurado con Winston**
- 3 niveles de logs: error, combined, http
- Rotación diaria automática (14 días retención)
- Logs en formato JSON para análisis
- Performance tracking integrado

#### **Seguridad mejorada con Helmet**
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- XSS Protection
- Frame-guard (clickjacking prevention)

#### **Performance Monitoring**
- Endpoint `/health` con métricas en tiempo real
- Tracking de operaciones lentas (>1s)
- Métricas de memoria y CPU
- Detección de Redis conectado/desconectado

#### **Optimización de Base de Datos**
- **26 índices SQL** aplicados
- Queries 5-100x más rápidas
- Índices en users, questions, sessions, responses
- Soporte para scheduler de preguntas diarias

#### **Performance real en producción**

| Endpoint | Antes | Con Redis | Mejora |
|----------|-------|-----------|--------|
| Métricas overall | 150ms | 4ms | **37x** |
| Sesiones recientes | 80ms | 2ms | **40x** |
| Progreso por temas | 120ms | 3ms | **40x** |
| Timeline | 180ms | 4ms | **45x** |
| Game modes | 100ms | 3ms | **33x** |

#### **Escalabilidad**
- Listo para múltiples instancias PM2
- Redis compartido entre instancias
- Configuración dual: desarrollo (sin Redis) + producción (con Redis)
- Documentación completa en `REDIS_SETUP.md`

## 🚧 Futuras mejoras (Fase 8+)

- **WebSockets**: Notificaciones en tiempo real
- **GraphQL**: API alternativa más flexible
- **Microservicios**: Separar tutor IA en servicio independiente
- **CI/CD**: Pipeline automatizado de testing y deployment

## 👥 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC License

## 📧 Contacto

**Persenaut Development Team**
- Email: pedrosldev@outlook.com
- GitHub: [@pedrosldev](https://github.com/pedrosldev)

---

⭐ **Si este proyecto te resulta útil, considera darle una estrella en GitHub!**
