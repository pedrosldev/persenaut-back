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

// Configuraciones
const corsOptions = require('./config/cors');

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

// ========================================
// INICIALIZACIÓN DE EXPRESS
// ========================================
const app = express();

// ========================================
// MIDDLEWARES GLOBALES
// ========================================
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));

// ========================================
// RUTAS DE LA API
// ========================================
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/intensive-review', intensiveReviewRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/user', profileRoutes);

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
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
  
  // Iniciar servicio de notificaciones programadas
  schedulerService.start();
  console.log(`⏰ Scheduler de notificaciones activo\n`);
});
