const { logger, logPerformance } = require('../config/logger');

/**
 * Middleware de Performance Monitoring
 * Mide tiempo de respuesta y detecta queries lentos
 */

/**
 * Thresholds para clasificar performance
 */
const PERFORMANCE_THRESHOLDS = {
  FAST: 100,        // < 100ms: Excelente
  NORMAL: 500,      // < 500ms: Normal
  SLOW: 1000,       // < 1s: Lento
  VERY_SLOW: 3000   // > 3s: Muy lento
};

/**
 * Middleware principal de monitoring de performance
 */
function performanceMonitor(req, res, next) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Capturar cuando la respuesta se envía
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    
    // Calcular uso de memoria
    const memoryDelta = {
      heapUsed: ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2),
      external: ((endMemory.external - startMemory.external) / 1024 / 1024).toFixed(2)
    };

    // Metadata del request
    const metadata = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
      memoryDelta: `${memoryDelta.heapUsed}MB heap, ${memoryDelta.external}MB external`
    };

    // Log según severidad
    if (duration > PERFORMANCE_THRESHOLDS.VERY_SLOW) {
      logger.error('Very Slow Request Detected', {
        ...metadata,
        severity: 'critical',
        threshold: `${PERFORMANCE_THRESHOLDS.VERY_SLOW}ms`
      });
    } else if (duration > PERFORMANCE_THRESHOLDS.SLOW) {
      logger.warn('Slow Request Detected', {
        ...metadata,
        severity: 'warning',
        threshold: `${PERFORMANCE_THRESHOLDS.SLOW}ms`
      });
    } else if (duration > PERFORMANCE_THRESHOLDS.NORMAL) {
      logger.info('Normal Request', {
        ...metadata,
        severity: 'info'
      });
    } else {
      // Solo loggear en debug para requests rápidos
      logger.debug('Fast Request', {
        ...metadata,
        severity: 'debug'
      });
    }

    // Loggear métricas de performance
    logPerformance(
      `${req.method} ${req.path}`,
      duration,
      {
        statusCode: res.statusCode,
        userId: req.user?.id,
        memoryUsage: memoryDelta
      }
    );
  });

  next();
}

/**
 * Wrapper para medir performance de operaciones asíncronas
 * Útil para medir queries de base de datos, llamadas a API externa, etc.
 * 
 * @param {string} operationName - Nombre de la operación
 * @param {Function} asyncFunction - Función async a medir
 * @param {Object} metadata - Metadata adicional
 * @returns {Promise<any>} Resultado de la función
 */
async function measureAsync(operationName, asyncFunction, metadata = {}) {
  const startTime = Date.now();
  
  try {
    const result = await asyncFunction();
    const duration = Date.now() - startTime;
    
    // Log de performance
    logPerformance(operationName, duration, {
      ...metadata,
      success: true
    });

    // Alerta si es muy lento
    if (duration > PERFORMANCE_THRESHOLDS.SLOW) {
      logger.warn('Slow async operation', {
        operation: operationName,
        duration: `${duration}ms`,
        ...metadata
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Async operation failed', {
      operation: operationName,
      duration: `${duration}ms`,
      error: error.message,
      ...metadata
    });

    throw error; // Re-lanzar error
  }
}

/**
 * Decorator para funciones/métodos (para usar con clases)
 * Mide automáticamente el tiempo de ejecución
 * 
 * @param {string} operationName - Nombre de la operación
 * @returns {Function} Decorator function
 */
function measurePerformance(operationName) {
  return function (target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args) {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logPerformance(`${operationName || propertyKey}`, duration, {
          method: propertyKey,
          class: target.constructor.name
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error('Method execution failed', {
          method: propertyKey,
          class: target.constructor.name,
          duration: `${duration}ms`,
          error: error.message
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Monitoreo de health de la aplicación
 * Retorna métricas del sistema
 */
function getSystemHealth() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime)
    },
    memory: {
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`
    },
    cpu: {
      usage: process.cpuUsage(),
      loadAverage: process.platform !== 'win32' ? require('os').loadavg() : 'N/A (Windows)'
    }
  };
}

/**
 * Formatear uptime a formato legible
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Endpoint handler para health check
 */
function healthCheckHandler(req, res) {
  const health = getSystemHealth();
  
  logger.info('Health check requested', {
    ip: req.ip,
    uptime: health.uptime.formatted
  });

  res.status(200).json(health);
}

module.exports = {
  performanceMonitor,
  measureAsync,
  measurePerformance,
  getSystemHealth,
  healthCheckHandler,
  PERFORMANCE_THRESHOLDS
};
