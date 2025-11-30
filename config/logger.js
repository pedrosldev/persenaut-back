const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

/**
 * Configuración de Winston Logger con rotación diaria
 * Características:
 * - Logs separados por nivel (error, combined)
 * - Formato JSON para parsing
 * - Rotación diaria automática
 * - Compresión de archivos antiguos
 * - Límite de retención (14 días)
 */

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../logs');

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para consola (desarrollo)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = '\n' + JSON.stringify(meta, null, 2);
    }
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * Transports: Error logs (solo errores)
 */
const errorFileTransport = new DailyRotateFile({
  level: 'error',
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

/**
 * Transports: Combined logs (todos los niveles)
 */
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat
});

/**
 * Transports: Console (solo en desarrollo)
 */
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * Logger principal
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'persenaut-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    errorFileTransport,
    combinedFileTransport,
    consoleTransport
  ],
  exitOnError: false
});

/**
 * Logger específico para requests HTTP
 * Incluye: método, URL, status, tiempo de respuesta
 */
const httpLogger = winston.createLogger({
  level: 'http',
  format: logFormat,
  defaultMeta: { service: 'persenaut-api-http' },
  transports: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
      format: logFormat
    })
  ]
});

/**
 * Middleware para logging de requests HTTP
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log cuando la respuesta termina
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    // Log en nivel apropiado según status code
    if (res.statusCode >= 500) {
      httpLogger.error('HTTP Request Error', logData);
    } else if (res.statusCode >= 400) {
      httpLogger.warn('HTTP Request Warning', logData);
    } else {
      httpLogger.http('HTTP Request', logData);
    }

    // Log de requests lentos (>1 segundo)
    if (duration > 1000) {
      logger.warn('Slow Request Detected', {
        ...logData,
        threshold: '1000ms'
      });
    }
  });

  next();
}

/**
 * Utilidad: Log de errores con contexto
 * @param {Error} error - Error a loggear
 * @param {Object} context - Contexto adicional
 */
function logError(error, context = {}) {
  logger.error('Error occurred', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  });
}

/**
 * Utilidad: Log de métricas de performance
 * @param {string} operation - Nombre de la operación
 * @param {number} duration - Duración en ms
 * @param {Object} metadata - Metadata adicional
 */
function logPerformance(operation, duration, metadata = {}) {
  const level = duration > 1000 ? 'warn' : 'info';
  logger.log(level, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
}

/**
 * Utilidad: Log de eventos de negocio
 * @param {string} event - Nombre del evento
 * @param {Object} data - Datos del evento
 */
function logBusinessEvent(event, data = {}) {
  logger.info('Business Event', {
    event,
    ...data
  });
}

// Event listeners para rotación de archivos
errorFileTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('Log file rotated', { oldFilename, newFilename });
});

// Log al iniciar
logger.info('Logger initialized', {
  logLevel: logger.level,
  environment: process.env.NODE_ENV,
  logsDirectory: logsDir
});

module.exports = {
  logger,
  httpLogger,
  requestLogger,
  logError,
  logPerformance,
  logBusinessEvent
};
