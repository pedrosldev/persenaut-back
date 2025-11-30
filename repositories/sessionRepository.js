const pool = require('../config/db');

/**
 * Repositorio para acceso a datos de sesiones intensivas
 */
class SessionRepository {
  /**
   * Crea una nueva sesión intensiva
   */
  async createIntensiveSession(sessionData) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO intensive_sessions (id, user_id, theme, total_questions, game_mode) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          sessionData.id,
          sessionData.userId,
          sessionData.theme,
          sessionData.totalQuestions,
          sessionData.gameMode || 'timed'
        ]
      );
      return sessionData.id;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene datos de una sesión por ID
   */
  async findById(sessionId) {
    const connection = await pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        `SELECT * FROM intensive_sessions WHERE id = ?`,
        [sessionId]
      );
      return sessions[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Actualiza los resultados de una sesión
   */
  async updateSessionResults(sessionId, correctAnswers, timeUsed) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE intensive_sessions 
         SET correct_answers = ?, time_used = ?, completed_at = NOW() 
         WHERE id = ?`,
        [correctAnswers, timeUsed, sessionId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Guarda una respuesta individual en session_challenges
   */
  async saveSessionChallenge(sessionId, challengeId, isCorrect) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO session_challenges (session_id, challenge_id, correct) 
         VALUES (?, ?, ?)`,
        [sessionId, challengeId, isCorrect]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Guarda múltiples respuestas (correctas o incorrectas)
   */
  async saveMultipleSessionChallenges(sessionId, challengeIds, isCorrect) {
    const connection = await pool.getConnection();
    try {
      for (const challengeId of challengeIds) {
        await connection.execute(
          `INSERT INTO session_challenges (session_id, challenge_id, correct) 
           VALUES (?, ?, ?)`,
          [sessionId, challengeId, isCorrect]
        );
      }
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Verifica si una sesión existe
   */
  async exists(sessionId) {
    const connection = await pool.getConnection();
    try {
      const [sessions] = await connection.execute(
        'SELECT id FROM intensive_sessions WHERE id = ?',
        [sessionId]
      );
      return sessions.length > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene sesiones intensivas recientes del usuario
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
}

module.exports = new SessionRepository();
