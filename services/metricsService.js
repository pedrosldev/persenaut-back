// services/metricsService.js
const metricsRepository = require("../repositories/metricsRepository");
const sessionRepository = require("../repositories/sessionRepository");

const MetricsService = {
  /**
   * Obtiene las métricas generales del usuario
   */
  getUserOverallMetrics: async (userId) => {
    return await metricsRepository.getUserMetrics(userId);
  },

  /**
   * Obtiene las sesiones recientes del usuario
   */
  getUserSessions: async (userId, limit = 20) => {
    return await metricsRepository.getRecentSessions(userId, limit);
  },

  /**
   * Obtiene los logros del usuario
   */
  getUserAchievements: async (userId) => {
    const pool = require("../config/db");
    const connection = await pool.getConnection();
    try {
      const [achievements] = await connection.execute(
        `SELECT * FROM user_achievements 
         WHERE user_id = ? 
         ORDER BY achieved_at DESC`,
        [userId]
      );
      return achievements;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtiene el progreso por temas
   */
  getUserThemeProgress: async (userId) => {
    // Obtiene estadísticas agregadas de todos los temas
    const themes = await metricsRepository.getThemeProgress(userId);
    return themes;
  },

  /**
   * Obtiene la evolución temporal del usuario
   */
  getUserProgressTimeline: async (userId, days = 30) => {
    return await metricsRepository.getProgressTimeline(userId, days);
  },

  /**
   * Obtiene estadísticas de rendimiento por modo de juego
   */
  getUserGameModeStats: async (userId) => {
    return await metricsRepository.getGameModeStats(userId);
  },
};

module.exports = MetricsService;
