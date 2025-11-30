const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

/**
 * Middleware de Rate Limiting con Memory Store (fallback si Redis no disponible)
 * Previene abuso de API y ataques de fuerza bruta
 * Estrategia: Diferentes límites por tipo de endpoint
 * 
 * NOTA: Usando memory store por defecto. Para usar Redis en producción:
 * 1. Iniciar Redis: docker run -p 6379:6379 -d redis:7-alpine
 * 2. Descomentar imports de RedisStore y redisClient
 * 3. Reemplazar store en cada limiter
 */

// OPCIONAL: Descomentar para usar Redis Store
// const RedisStore = require('rate-limit-redis').default;
// const { redisClient } = require('../config/redis');

/**
 * Handler personalizado para cuando se excede el límite
 */
const rateLimitHandler = (req, res) => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    userAgent: req.get('user-agent')
  });

  res.status(429).json({
    error: 'Demasiadas peticiones',
    message: 'Has excedido el límite de peticiones. Por favor intenta más tarde.',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Función para generar key única por usuario o IP
 */
const keyGenerator = (req) => {
  // Si está autenticado, usar userId
  if (req.user && req.user.id) {
    return `ratelimit:user:${req.user.id}:${req.path}`;
  }
  // Si no, usar IP
  return `ratelimit:ip:${req.ip}:${req.path}`;
};

/**
 * Skip rate limiting en desarrollo (opcional)
 */
const skipRateLimitInDev = (req) => {
  return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
};

/**
 * Rate Limiter para endpoints de autenticación
 * Más restrictivo para prevenir ataques de fuerza bruta
 * 
 * Límite: 5 peticiones por 15 minutos
 * Aplicar a: /auth/login, /auth/register
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 peticiones
  message: 'Demasiados intentos de autenticación. Por favor intenta en 15 minutos.',
  standardHeaders: true, // Retornar info en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilitar headers `X-RateLimit-*`
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // Para usar Redis, descomentar:
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:auth:',
  // }),

  keyGenerator: (req) => {
    // Para auth, siempre usar IP (prevenir múltiples cuentas)
    return `ratelimit:auth:${req.ip}`;
  }
});

/**
 * Rate Limiter para API general
 * Límite moderado para uso normal
 * 
 * Límite: 100 peticiones por 15 minutos
 * Aplicar a: Todos los endpoints /api/*
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 peticiones
  message: 'Demasiadas peticiones a la API. Por favor intenta en 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:api:',
  // }),
  
  keyGenerator
});

/**
 * Rate Limiter para modo intensivo
 * Más permisivo pero con control
 * 
 * Límite: 20 sesiones por minuto
 * Aplicar a: /intensive/*
 */
const intensiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 peticiones
  message: 'Demasiadas peticiones al modo intensivo. Por favor espera un momento.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:intensive:',
  // }),
  
  keyGenerator
});

/**
 * Rate Limiter para generación de desafíos con IA
 * Más restrictivo por costo de API externa (Groq)
 * 
 * Límite: 10 peticiones por minuto
 * Aplicar a: /challenges/groq, /challenges/generate
 */
const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 peticiones
  message: 'Demasiadas peticiones de generación con IA. Por favor espera un momento.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:ai:',
  // }),
  
  keyGenerator
});

/**
 * Rate Limiter para tutor IA
 * Restrictivo por procesamiento intensivo
 * 
 * Límite: 3 peticiones por 5 minutos
 * Aplicar a: /tutor/advice
 */
const tutorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 3, // 3 peticiones
  message: 'Demasiadas peticiones al tutor IA. El análisis profundo requiere tiempo. Intenta en 5 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:tutor:',
  // }),
  
  keyGenerator
});

/**
 * Rate Limiter para métricas
 * Moderado para permitir dashboards
 * 
 * Límite: 30 peticiones por minuto
 * Aplicar a: /metrics/*
 */
const metricsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 peticiones
  message: 'Demasiadas peticiones de métricas. Por favor espera un momento.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:metrics:',
  // }),
  
  keyGenerator
});

/**
 * Rate Limiter global (fallback)
 * Para endpoints sin límite específico
 * 
 * Límite: 200 peticiones por 15 minutos
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // 200 peticiones
  message: 'Demasiadas peticiones. Por favor intenta más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipRateLimitInDev,
  
  // Memory store (fallback cuando Redis no está disponible)
  // store: new RedisStore({
  //   sendCommand: (...args) => redisClient.call(...args),
  //   prefix: 'rl:global:',
  // }),
  
  keyGenerator
});

/**
 * Utilidad: Resetear límite de rate para un usuario/IP específico
 * @param {string} identifier - userId o IP
 * @param {string} prefix - Prefijo del limiter (auth, api, etc.)
 * 
 * NOTA: Requiere Redis. Si usas memory store, esta función no funciona.
 */
async function resetRateLimit(identifier, prefix = 'api') {
  try {
    // Descomentar cuando uses Redis:
    // const { redisClient } = require('../config/redis');
    // const key = `rl:${prefix}:ratelimit:${identifier}:*`;
    // const keys = await redisClient.keys(key);
    // 
    // if (keys.length > 0) {
    //   await redisClient.del(...keys);
    //   logger.info('Rate limit reset', { identifier, prefix, keysDeleted: keys.length });
    //   return true;
    // }
    
    logger.warn('resetRateLimit requires Redis. Using memory store - rate limits cannot be reset programmatically.');
    return false;
  } catch (error) {
    logger.error('Failed to reset rate limit', { identifier, prefix, error: error.message });
    return false;
  }
}

module.exports = {
  authLimiter,
  apiLimiter,
  intensiveLimiter,
  aiGenerationLimiter,
  tutorLimiter,
  metricsLimiter,
  globalLimiter,
  resetRateLimit
};
