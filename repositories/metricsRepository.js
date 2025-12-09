const pool = require('../config/db');

/**
 * Repositorio para acceso a datos de métricas y estadísticas
 */
class MetricsRepository {
  /**
   * Obtiene las métricas generales de un usuario
   */
  async getUserMetrics(userId) {
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
  }

  /**
   * Guarda o actualiza las métricas de un usuario
   */
  async upsertUserMetrics(userId, metricsData, connection = null) {
    const conn = connection || await pool.getConnection();
    try {
      await conn.execute(
        `INSERT INTO user_metrics 
         (user_id, total_points, total_sessions, total_correct_answers, total_time_spent, average_accuracy) 
         VALUES (?, ?, 1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_points = total_points + ?,
         total_sessions = total_sessions + 1,
         total_correct_answers = total_correct_answers + ?,
         total_time_spent = total_time_spent + ?,
         average_accuracy = (average_accuracy * total_sessions + ?) / (total_sessions + 1)`,
        [
          userId,
          metricsData.points,
          metricsData.correctAnswers,
          metricsData.timeSpent,
          metricsData.accuracy,
          metricsData.points,
          metricsData.correctAnswers,
          metricsData.timeSpent,
          metricsData.accuracy
        ]
      );
      return true;
    } finally {
      if (!connection) conn.release();
    }
  }

  /**
   * Guarda el score de una sesión
   */
  async saveSessionScore(scoreData) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO session_scores 
         (user_id, session_id, points_earned, accuracy, time_spent, game_mode, theme) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          scoreData.userId,
          scoreData.sessionId,
          scoreData.points,
          scoreData.accuracy,
          scoreData.timeSpent,
          scoreData.gameMode,
          scoreData.theme
        ]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene sesiones recientes de un usuario
   */
  async getRecentSessions(userId, limit = 20) {
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
  }

  /**
   * Obtiene progreso por temas de un usuario
   */
  async getThemeProgress(userId) {
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
  }

  /**
   * Obtiene estadísticas de respuestas de usuario (para tutor)
   */
  async getUserResponseStats(userId, timeRange) {
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(
        `SELECT 
          COUNT(*) as total_questions,
          SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          AVG(CASE WHEN ur.is_correct = 1 THEN ur.response_time ELSE NULL END) as avg_correct_time,
          AVG(CASE WHEN ur.is_correct = 0 THEN ur.response_time ELSE NULL END) as avg_incorrect_time,
          q.theme,
          COUNT(DISTINCT q.theme) as themes_count
        FROM user_responses ur
        JOIN questions q ON ur.question_id = q.id
        WHERE ur.user_id = ? 
          AND ur.created_at >= DATE_SUB(NOW(), INTERVAL 1 ${timeRange.toUpperCase()})
        GROUP BY q.theme
        ORDER BY correct_answers ASC`,
        [userId]
      );
      return stats;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene estadísticas de modo intensivo (para tutor)
   */
  async getIntensiveStats(userId, timeRange) {
    const connection = await pool.getConnection();
    try {
      const [stats] = await connection.execute(
        `SELECT 
          isess.theme,
          isess.game_mode,
          COUNT(*) as total_questions,
          SUM(CASE WHEN ir.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
          AVG(ir.response_time) as avg_response_time,
          (SUM(CASE WHEN ir.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
        FROM intensive_responses ir
        JOIN intensive_sessions isess ON ir.session_id = isess.id
        WHERE isess.user_id = ?
          AND ir.created_at >= DATE_SUB(NOW(), INTERVAL 1 ${timeRange.toUpperCase()})
        GROUP BY isess.theme, isess.game_mode
        ORDER BY success_rate ASC`,
        [userId]
      );
      return stats;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene temas con mayor dificultad para un usuario
   */
  async getWeakThemes(userId, limit = 5) {
    const connection = await pool.getConnection();
    try {
      const [themes] = await connection.execute(
        `SELECT 
          theme,
          SUM(total_attempts) as total_attempts,
          SUM(correct_attempts) as correct_attempts,
          (SUM(correct_attempts) / SUM(total_attempts)) * 100 as success_rate
        FROM (
          -- Retos diarios
          SELECT 
            q.theme,
            COUNT(*) as total_attempts,
            SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts
          FROM user_responses ur
          JOIN questions q ON ur.question_id = q.id
          WHERE ur.user_id = ?
          GROUP BY q.theme
          
          UNION ALL
          
          -- Sesiones intensivas
          SELECT 
            theme,
            total_questions as total_attempts,
            correct_answers as correct_attempts
          FROM intensive_sessions
          WHERE user_id = ?
        ) AS combined_stats
        WHERE theme IS NOT NULL AND theme != ''
        GROUP BY theme
        HAVING total_attempts >= 3
        ORDER BY success_rate ASC
        LIMIT ?`,
        [userId, userId, limit]
      );
      return themes;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene temas con mejor rendimiento (fortalezas)
   */
  async getStrongThemes(userId, limit = 5) {
    const connection = await pool.getConnection();
    try {
      const [themes] = await connection.execute(
        `SELECT 
          theme,
          SUM(total_attempts) as total_attempts,
          SUM(correct_attempts) as correct_attempts,
          (SUM(correct_attempts) / SUM(total_attempts)) * 100 as success_rate
        FROM (
          -- Retos diarios
          SELECT 
            q.theme,
            COUNT(*) as total_attempts,
            SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts
          FROM user_responses ur
          JOIN questions q ON ur.question_id = q.id
          WHERE ur.user_id = ?
          GROUP BY q.theme
          
          UNION ALL
          
          -- Sesiones intensivas
          SELECT 
            theme,
            total_questions as total_attempts,
            correct_answers as correct_attempts
          FROM intensive_sessions
          WHERE user_id = ?
        ) AS combined_stats
        WHERE theme IS NOT NULL AND theme != ''
        GROUP BY theme
        HAVING total_attempts >= 3
        ORDER BY success_rate DESC
        LIMIT ?`,
        [userId, userId, limit]
      );
      return themes;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene sesiones intensivas recientes
   */
  async getRecentIntensiveSessions(userId, limit = 5) {
    const connection = await pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        `SELECT 
          theme,
          game_mode,
          total_questions,
          correct_answers,
          (correct_answers / total_questions) * 100 as accuracy,
          time_used,
          created_at
        FROM intensive_sessions 
        WHERE user_id = ?
        ORDER BY created_at DESC 
        LIMIT ?`,
        [userId, limit]
      );
      return sessions;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene evolución temporal del usuario
   */
  async getProgressTimeline(userId, days = 30) {
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
  }

  /**
   * Obtiene estadísticas por modo de juego
   */
  async getGameModeStats(userId) {
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
  }
}

module.exports = new MetricsRepository();
