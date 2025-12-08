const pool = require('../config/db');

/**
 * Repositorio para acceso a datos de la tabla questions (retos/preguntas)
 */
class ChallengeRepository {
  /**
   * Guarda un nuevo reto en la base de datos
   */
  async save(challenge) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO questions 
         (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, display_status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          challenge.theme,
          challenge.level,
          challenge.question,
          JSON.stringify(challenge.options),
          challenge.correctAnswer,
          challenge.rawResponse,
          challenge.userId,
          challenge.deliveryTime || "09:00:00",
          challenge.frequency || "daily",
          challenge.isActive !== undefined ? challenge.isActive : true,
          challenge.displayStatus || "pending",
        ]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  /**
   * Encuentra retos por tema y usuario
   */
  async findByThemeAndUser(userId, theme, limit = 10) {
    const connection = await pool.getConnection();
    try {
      const [challenges] = await connection.execute(
        `SELECT id, theme, question, options, correct_answer, level
         FROM questions 
         WHERE user_id = ? AND theme LIKE ? 
         ORDER BY RAND() 
         LIMIT ?`,
        [userId, `%${theme}%`, limit]
      );
      return challenges;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene las preguntas más recientes de un tema (para contexto negativo)
   * @param {string} theme - Tema de las preguntas
   * @param {number} limit - Número de preguntas a obtener
   * @returns {Promise<Array>} Array de preguntas recientes
   */
  async getRecentQuestionsByTheme(theme, limit = 15) {
    const connection = await pool.getConnection();
    try {
      const [questions] = await connection.execute(
        `SELECT question
         FROM questions 
         WHERE theme LIKE ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
        [`%${theme}%`, limit]
      );
      return questions;
    } finally {
      connection.release();
    }
  }

  /**
   * Encuentra retos excluyendo IDs ya usados
   */
  async findByThemeExcludingIds(userId, theme, excludeIds = [], limit = 5) {
    const connection = await pool.getConnection();
    try {
      const [challenges] = await connection.execute(
        `SELECT id, theme, question, options, correct_answer 
         FROM questions 
         WHERE user_id = ? AND theme LIKE ? 
         AND id NOT IN (?)
         ORDER BY RAND() 
         LIMIT ?`,
        [userId, `%${theme}%`, excludeIds.length > 0 ? excludeIds : [0], limit]
      );
      return challenges;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene retos pendientes de un usuario
   */
  async findPendingByUser(userId) {
    const connection = await pool.getConnection();
    try {
      const [challenges] = await connection.execute(
        `SELECT id, theme, level, question, options, correct_answer, 
                display_status, frequency, created_at
         FROM questions 
         WHERE user_id = ? 
         AND display_status = 'pending'
         AND is_active = false
         ORDER BY created_at DESC`,
        [userId]
      );
      return challenges;
    } finally {
      connection.release();
    }
  }

  /**
   * Encuentra un reto por ID
   */
  async findById(questionId) {
    const connection = await pool.getConnection();
    try {
      const [questions] = await connection.execute(
        'SELECT * FROM questions WHERE id = ?',
        [questionId]
      );
      return questions[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene la respuesta correcta de un reto
   */
  async getCorrectAnswer(questionId) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.execute(
        'SELECT correct_answer FROM questions WHERE id = ?',
        [questionId]
      );
      return result[0]?.correct_answer || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Actualiza el estado de visualización de un reto
   */
  async updateDisplayStatus(challengeId, status) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `UPDATE questions SET display_status = ? WHERE id = ?`,
        [status, challengeId]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene temas únicos de un usuario
   */
  async findUniqueThemesByUser(userId) {
    const connection = await pool.getConnection();
    try {
      const [themes] = await connection.execute(
        `SELECT DISTINCT theme FROM questions 
         WHERE user_id = ? AND theme IS NOT NULL AND theme != ''`,
        [userId]
      );
      return themes.map((t) => t.theme);
    } finally {
      connection.release();
    }
  }
}

module.exports = new ChallengeRepository();
