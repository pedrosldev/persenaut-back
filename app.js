// ========================================
// CONFIGURACIÓN INICIAL
// ========================================
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config({ path: '.env' });
}

console.log(`Entorno: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`API Key: ${process.env.GROQ_API_KEY ? 'Configurada ✓' : 'No configurada ✗'}`);

// ========================================
// DEPENDENCIAS
// ========================================
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

// Configuraciones
const corsOptions = require('./config/cors');
const swaggerSpec = require('./config/swagger');
const { logger, requestLogger } = require('./config/logger');

// Rutas
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const tutorRoutes = require('./routes/tutor');
const intensiveReviewRoutes = require('./routes/intensiveReview');
const metricsRoutes = require('./routes/metrics');
const themeRoutes = require('./routes/themes');
const profileRoutes = require('./routes/profile');

// Servicios
const schedulerService = require('./services/schedulerService');

// Middlewares
const errorHandler = require('./middlewares/errorHandler');
const { performanceMonitor, healthCheckHandler } = require('./middlewares/performanceMonitor');
const { 
  authLimiter, 
  apiLimiter, 
  intensiveLimiter, 
  aiGenerationLimiter, 
  tutorLimiter, 
  metricsLimiter 
} = require('./middlewares/rateLimiter');

// ========================================
// INICIALIZACIÓN DE EXPRESS
// ========================================
const app = express();

// ========================================
// MIDDLEWARES GLOBALES
// ========================================

// Seguridad con Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));

// Logging de requests
app.use(requestLogger);

// Performance monitoring
app.use(performanceMonitor);

app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));

// ========================================
// HEALTH CHECK ENDPOINT
// ========================================
app.get('/health', healthCheckHandler);

// ========================================
// DOCUMENTACIÓN API (Swagger)
// ========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Persenaut API Docs',
  customfavIcon: '/favicon.ico'
}));

// ========================================
// RUTAS DE LA API (con rate limiting)
// ========================================
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/challenges', aiGenerationLimiter, challengeRoutes);
app.use('/api/tutor', tutorLimiter, tutorRoutes);
app.use('/api/intensive-review', intensiveLimiter, intensiveReviewRoutes);
app.use('/api/metrics', metricsLimiter, metricsRoutes);
app.use('/api/themes', apiLimiter, themeRoutes);
app.use('/api/user', apiLimiter, profileRoutes);

// ========================================
// RUTAS LEGACY (Mantener compatibilidad con frontend antiguo)
// ========================================
const challengeController = require('./controllers/challengeController');
const tutorController = require('./controllers/tutorController');
const pendingChallengesController = require('./controllers/pendingChallengesController');

// Redirigir rutas antiguas a los controladores
app.post('/api/reto', challengeController.generateChallenge.bind(challengeController));
app.post('/api/groq', challengeController.generateWithGroq.bind(challengeController));
app.post('/api/generate-from-notes', challengeController.generateFromNotes.bind(challengeController));
app.post('/api/save-response', challengeController.saveResponse.bind(challengeController));
app.post('/api/save-intensive-response', challengeController.saveIntensiveResponse.bind(challengeController));
app.post('/api/pending-challenges', pendingChallengesController.getPendingChallenges.bind(pendingChallengesController));
app.post('/api/start-challenge', pendingChallengesController.startChallenge.bind(pendingChallengesController));
app.post('/api/tutor-advice', tutorController.getTutorAdvice.bind(tutorController));

// ========================================
// MANEJO DE ERRORES (debe ir al final)
// ========================================
app.use(errorHandler);

// ========================================
// INICIAR SERVIDOR
// ========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 Servidor Persenaut iniciado correctamente`);
  console.log(`📡 Escuchando en http://localhost:${PORT}`);
  console.log(`📚 Documentación API disponible en http://localhost:${PORT}/api-docs`);
  console.log(`💚 Health check disponible en http://localhost:${PORT}/health`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
  
  // Log estructurado con Winston
  logger.info('Persenaut API Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
  
  // Iniciar servicio de notificaciones programadas
  schedulerService.start();
  console.log(`⏰ Scheduler de notificaciones activo\n`);
});
