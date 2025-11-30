const tutorService = require('../services/tutorService');

/**
 * Controlador para el tutor IA
 */
class TutorController {
  /**
   * Obtiene análisis y recomendaciones del tutor IA
   * POST /api/tutor/advice
   */
  async getTutorAdvice(req, res, next) {
    const { userId, timeRange = "week" } = req.body;

    try {
      const advice = await tutorService.generateTutorAdvice(userId, timeRange);
      res.json(advice);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TutorController();
