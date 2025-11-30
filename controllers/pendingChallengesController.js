const challengeRepository = require('../repositories/challengeRepository');

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
      const challenges = await challengeRepository.findPendingByUser(userId);

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
      await challengeRepository.updateDisplayStatus(challengeId, 'active');

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
