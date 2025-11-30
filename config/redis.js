const Redis = require('ioredis');

/**
 * Configuración de Redis Client con manejo de conexión robusto
 * Incluye: connection pooling, auto-reconnect, error handling, health checks
 */

// Configuración de opciones de Redis
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  
  // Connection pooling
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Reconnection strategy
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Reintentando conexión a Redis (intento ${times}) en ${delay}ms`);
    return delay;
  },
  
  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,
  
  // Connection behavior
  lazyConnect: false, // Conectar inmediatamente
  keepAlive: 30000,   // Keep-alive cada 30 segundos
  
  // TLS (si se usa Redis Cloud o producción)
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
};

/**
 * Crear cliente de Redis con manejo de eventos
 */
const redisClient = new Redis(redisOptions);

// Event: Conexión exitosa
redisClient.on('connect', () => {
  console.log('✅ Redis: Conectado al servidor');
});

// Event: Listo para recibir comandos
redisClient.on('ready', () => {
  console.log('🚀 Redis: Cliente listo para recibir comandos');
});

// Event: Error en conexión
redisClient.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
});

// Event: Reconexión
redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconectando...');
});

// Event: Desconexión
redisClient.on('close', () => {
  console.log('⚠️ Redis: Conexión cerrada');
});

/**
 * Health check: Verificar si Redis está disponible
 * @returns {Promise<boolean>} true si Redis responde, false si falla
 */
async function isRedisHealthy() {
  try {
    const result = await redisClient.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check falló:', error.message);
    return false;
  }
}

/**
 * Graceful shutdown: Cerrar conexión de Redis limpiamente
 */
async function closeRedis() {
  try {
    await redisClient.quit();
    console.log('✅ Redis: Conexión cerrada correctamente');
  } catch (error) {
    console.error('❌ Error al cerrar Redis:', error.message);
    // Forzar cierre si quit() falla
    redisClient.disconnect();
  }
}

// Manejar cierre de aplicación
process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});

module.exports = {
  redisClient,
  isRedisHealthy,
  closeRedis
};
