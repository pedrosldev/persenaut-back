// services/metricsService.js
const pool = require("../config/db");

const MetricsService = {
  /**
   * Obtiene las métricas generales del usuario
   */
  getUserOverallMetrics: async (userId) => {
    const connection = await pool.getConnection();
    try {
      const [metrics] = await connection.execute(
        `SELECT * FROM user_metrics WHERE user_id = ?`,
        [userId]
      );
      return metrics[0] || null;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtiene las sesiones recientes del usuario
   */
  getUserSessions: async (userId, limit = 20) => {
    const connection = await pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        `SELECT * FROM session_scores 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [userId, limit]
      );
      return sessions;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtiene los logros del usuario
   */
  getUserAchievements: async (userId) => {
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
    const connection = await pool.getConnection();
    try {
      const [themes] = await connection.execute(
        `SELECT 
          theme,
          COUNT(*) as total_sessions,
          AVG(accuracy) as average_accuracy,
          SUM(points_earned) as total_points,
          SUM(time_spent) as total_time
         FROM session_scores 
         WHERE user_id = ?
         GROUP BY theme
         ORDER BY average_accuracy DESC`,
        [userId]
      );
      return themes;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtiene la evolución temporal del usuario
   */
  getUserProgressTimeline: async (userId, days = 30) => {
    const connection = await pool.getConnection();
    try {
      const [timeline] = await connection.execute(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as sessions_count,
          AVG(accuracy) as daily_accuracy,
          SUM(points_earned) as daily_points
         FROM session_scores 
         WHERE user_id = ? 
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [userId, days]
      );
      return timeline;
    } finally {
      connection.release();
    }
  },

  /**
   * Obtiene estadísticas de rendimiento por modo de juego
   */
  getUserGameModeStats: async (userId) => {
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(
        `SELECT 
          game_mode,
          COUNT(*) as total_sessions,
          AVG(accuracy) as average_accuracy,
          AVG(points_earned) as average_points,
          SUM(time_spent) as total_time
         FROM session_scores 
         WHERE user_id = ?
         GROUP BY game_mode`,
        [userId]
      );
      return stats;
    } finally {
      connection.release();
    }
  },
};

module.exports = MetricsService;
