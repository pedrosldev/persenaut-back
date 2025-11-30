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
- **MySQL** (mysql2)
- **Groq SDK** v0.30.0 (IA generativa)
- **JWT** para autenticación
- **express-validator** para validación
- **Swagger** para documentación API
- **Jest** para testing

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
```

5. **Configurar base de datos**

Ejecutar el script SQL para crear las tablas necesarias (ver `database/schema.sql`)

## 🏗️ Arquitectura

### Estructura de carpetas

```
persenaut-back/
├── config/              # Configuraciones (DB, CORS, Groq, Swagger)
│   ├── cors.js
│   ├── db.js
│   ├── groq.js
│   └── swagger.js
├── controllers/         # Controladores (lógica de endpoints)
│   ├── challengeController.js
│   ├── intensiveController.js
│   ├── pendingChallengesController.js
│   └── tutorController.js
├── middlewares/         # Middlewares (auth, errores, validación)
│   ├── authMiddleware.js
│   ├── errorHandler.js
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
│   ├── emailService.js
│   ├── intensiveService.js
│   ├── metricsService.js
│   ├── promptService.js
│   ├── schedulerService.js
│   ├── scoringService.js
│   ├── tutorService.js
│   └── userServices.js
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

#### Metrics
- `GET /api/metrics/user/:userId/metrics/overall` - Métricas generales
- `GET /api/metrics/user/:userId/metrics/sessions` - Sesiones recientes
- `GET /api/metrics/user/:userId/metrics/themes` - Progreso por temas
- `GET /api/metrics/user/:userId/metrics/timeline` - Evolución temporal
- `GET /api/metrics/user/:userId/metrics/game-modes` - Estadísticas por modo

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

## 🌟 Mejoras recientes (Fases 1-5)

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

### ✅ Fase 6: Documentación API (ACTUAL)
- Swagger/OpenAPI 3.0 integrado
- Documentación interactiva en `/api-docs`
- JSDoc en servicios críticos
- Schemas reutilizables para modelos

## 🚧 Próximas mejoras (Fase 7)

- **Redis caching**: Para métricas y preguntas frecuentes
- **Rate limiting**: Protección contra abuso de API
- **Optimización de queries**: Índices y paginación
- **Monitoring**: Logs estructurados y métricas de rendimiento

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
- Email: support@persenaut.com
- GitHub: [@pedrosldev](https://github.com/pedrosldev)

---

⭐ **Si este proyecto te resulta útil, considera darle una estrella en GitHub!**
