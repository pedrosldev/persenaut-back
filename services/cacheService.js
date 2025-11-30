const { redisClient } = require('../config/redis');
const { logger, logPerformance } = require('../config/logger');

/**
 * Servicio de caché con Redis para optimizar consultas frecuentes
 * Implementa estrategias de TTL y cache-aside pattern
 */

/**
 * Estrategias de TTL (Time To Live) en segundos
 */
const TTL = {
  SHORT: 60,           // 1 minuto - Datos muy volátiles
  MEDIUM: 300,         // 5 minutos - Métricas de usuario
  LONG: 1800,          // 30 minutos - Temas, configuraciones
  VERY_LONG: 3600,     // 1 hora - Datos casi estáticos
  DAY: 86400           // 24 horas - Datos de archivo
};

/**
 * Prefijos para organizar keys en Redis
 */
const KEY_PREFIX = {
  USER_METRICS: 'metrics:user:',
  USER_SESSIONS: 'sessions:user:',
  USER_THEMES: 'themes:user:',
  THEME_PROGRESS: 'progress:theme:',
  TUTOR_ADVICE: 'tutor:advice:',
  CHALLENGE: 'challenge:',
  LEADERBOARD: 'leaderboard:'
};

/**
 * CacheService: Wrapper para operaciones de caché con Redis
 */
const CacheService = {
  /**
   * Obtener valor desde caché
   * @param {string} key - Key de Redis
   * @returns {Promise<any|null>} Valor parseado o null si no existe
   */
  async get(key) {
    const startTime = Date.now();
    try {
      const value = await redisClient.get(key);
      
      if (value) {
        logPerformance('cache.get', Date.now() - startTime, { 
          key, 
          hit: true 
        });
        return JSON.parse(value);
      }
      
      logPerformance('cache.get', Date.now() - startTime, { 
        key, 
        hit: false 
      });
      return null;
    } catch (error) {
      logger.error('Cache GET error', { key, error: error.message });
      return null; // Fail gracefully
    }
  },

  /**
   * Guardar valor en caché con TTL
   * @param {string} key - Key de Redis
   * @param {any} value - Valor a guardar (será serializado a JSON)
   * @param {number} ttl - Tiempo de vida en segundos (default: TTL.MEDIUM)
   * @returns {Promise<boolean>} true si se guardó exitosamente
   */
  async set(key, value, ttl = TTL.MEDIUM) {
    const startTime = Date.now();
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setex(key, ttl, serialized);
      
      logPerformance('cache.set', Date.now() - startTime, { 
        key, 
        ttl,
        size: serialized.length 
      });
      return true;
    } catch (error) {
      logger.error('Cache SET error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Eliminar una key específica
   * @param {string} key - Key a eliminar
   * @returns {Promise<boolean>} true si se eliminó
   */
  async delete(key) {
    try {
      const result = await redisClient.del(key);
      logger.info('Cache DELETE', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Cache DELETE error', { key, error: error.message });
      return false;
    }
  },

  /**
   * Eliminar todas las keys que coincidan con un patrón
   * @param {string} pattern - Patrón de keys (ej: 'metrics:user:*')
   * @returns {Promise<number>} Número de keys eliminadas
   */
  async deletePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await redisClient.del(...keys);
      logger.info('Cache DELETE PATTERN', { pattern, count: result });
      return result;
    } catch (error) {
      logger.error('Cache DELETE PATTERN error', { pattern, error: error.message });
      return 0;
    }
  },

  /**
   * Invalidar caché de un usuario específico
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} Número de keys invalidadas
   */
  async invalidateUser(userId) {
    const patterns = [
      `${KEY_PREFIX.USER_METRICS}${userId}:*`,
      `${KEY_PREFIX.USER_SESSIONS}${userId}:*`,
      `${KEY_PREFIX.USER_THEMES}${userId}`,
      `${KEY_PREFIX.TUTOR_ADVICE}${userId}:*`
    ];

    let totalDeleted = 0;
    for (const pattern of patterns) {
      totalDeleted += await this.deletePattern(pattern);
    }

    logger.info('User cache invalidated', { userId, keysDeleted: totalDeleted });
    return totalDeleted;
  },

  /**
   * Cache-aside pattern: Obtener o ejecutar función
   * Si existe en caché, retorna valor cacheado
   * Si no existe, ejecuta función, cachea resultado y lo retorna
   * 
   * @param {string} key - Key de Redis
   * @param {Function} fetchFunction - Función async que retorna los datos
   * @param {number} ttl - Tiempo de vida en segundos
   * @returns {Promise<any>} Datos (desde caché o función)
   */
  async getOrSet(key, fetchFunction, ttl = TTL.MEDIUM) {
    // Intentar obtener desde caché
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss: ejecutar función
    const startTime = Date.now();
    try {
      const freshData = await fetchFunction();
      
      // Guardar en caché para próxima vez
      await this.set(key, freshData, ttl);
      
      logPerformance('cache.getOrSet', Date.now() - startTime, { 
        key, 
        cacheMiss: true 
      });
      
      return freshData;
    } catch (error) {
      logger.error('Cache getOrSet fetch error', { key, error: error.message });
      throw error; // Propagar error original
    }
  },

  /**
   * Incrementar contador atómicamente (útil para rate limiting)
   * @param {string} key - Key del contador
   * @param {number} ttl - Tiempo de expiración en segundos
   * @returns {Promise<number>} Valor actual del contador
   */
  async increment(key, ttl = 60) {
    try {
      const value = await redisClient.incr(key);
      
      // Si es el primer incremento, setear TTL
      if (value === 1) {
        await redisClient.expire(key, ttl);
      }
      
      return value;
    } catch (error) {
      logger.error('Cache INCREMENT error', { key, error: error.message });
      return 0;
    }
  },

  /**
   * Verificar si Redis está disponible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const result = await redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis availability check failed', { error: error.message });
      return false;
    }
  },

  /**
   * Obtener estadísticas de uso de memoria de Redis
   * @returns {Promise<Object>} Estadísticas de memoria
   */
  async getMemoryStats() {
    try {
      const info = await redisClient.info('memory');
      const stats = {};
      
      info.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });
      
      return {
        usedMemory: stats.used_memory_human,
        peakMemory: stats.used_memory_peak_human,
        memoryFragmentation: stats.mem_fragmentation_ratio
      };
    } catch (error) {
      logger.error('Failed to get memory stats', { error: error.message });
      return null;
    }
  },

  // Re-exportar constantes para uso externo
  TTL,
  KEY_PREFIX
};

module.exports = CacheService;
