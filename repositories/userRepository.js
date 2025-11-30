const pool = require('../config/db');

/**
 * Repositorio para acceso a datos de usuarios y sus respuestas
 */
class UserRepository {
  /**
   * Guarda una respuesta de usuario a un reto
   */
  async saveUserResponse(responseData) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO user_responses (user_id, question_id, selected_answer, is_correct, response_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          responseData.userId,
          responseData.questionId,
          responseData.selectedAnswer,
          responseData.isCorrect,
          responseData.responseTime
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Guarda una respuesta de modo intensivo
   */
  async saveIntensiveResponse(responseData) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO intensive_responses (session_id, question_id, selected_answer, is_correct, response_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          responseData.sessionId,
          responseData.questionId,
          responseData.selectedAnswer,
          responseData.isCorrect,
          responseData.responseTime
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Encuentra un usuario por ID
   */
  async findById(userId) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Encuentra un usuario por email
   */
  async findByEmail(email) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return users[0] || null;
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserRepository();
