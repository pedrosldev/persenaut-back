const pool = require('../config/db');

/**
 * Controlador para gestión de retos pendientes
 */
class PendingChallengesController {
  /**
   * Obtiene los retos pendientes de un usuario
   * POST /api/pending-challenges
   */
  async getPendingChallenges(req, res, next) {
    const { userId } = req.body;

    try {
      const connection = await pool.getConnection();
      
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

      connection.release();

      res.json({
        success: true,
        challenges: challenges.map(challenge => ({
          ...challenge,
          options: JSON.parse(challenge.options)
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Inicia un reto pendiente
   * POST /api/start-challenge
   */
  async startChallenge(req, res, next) {
    const { challengeId } = req.body;

    try {
      const connection = await pool.getConnection();
      
      await connection.execute(
        `UPDATE questions SET display_status = 'active' WHERE id = ?`,
        [challengeId]
      );

      connection.release();

      res.json({
        success: true,
        message: "Reto iniciado correctamente"
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PendingChallengesController();
