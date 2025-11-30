const { v4: uuidv4 } = require("uuid");
const intensiveService = require("../services/intensiveService");
const sessionRepository = require("../repositories/sessionRepository");
const challengeRepository = require("../repositories/challengeRepository");
const ScoringService = require("../services/scoringService");
const pool = require("../config/db");

/**
 * Controlador para sesiones de repaso intensivo
 */
class IntensiveController {
  /**
   * Inicia una nueva sesión intensiva
   * POST /api/intensive-review/start
   */
  async startSession(req, res, next) {
    try {
      const { userId, theme, gameMode = "timed" } = req.body;
      const sessionId = uuidv4();

      // Obtener retos para la sesión
      const challenges = await intensiveService.getChallengesForSession(
        userId,
        theme,
        gameMode === "survival" ? 15 : 10,
        gameMode
      );

      if (challenges.length === 0) {
        return res.status(404).json({ error: "No hay retos para este tema" });
      }

      // Crear sesión
      await sessionRepository.createIntensiveSession({
        id: sessionId,
        userId,
        theme,
        totalQuestions: challenges.length,
        gameMode,
      });

      res.json({
        sessionId,
        gameMode,
        challenges: challenges.map((c) => ({
          ...c,
          options: JSON.parse(c.options),
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Guarda los resultados de una sesión intensiva
   * POST /api/intensive-review/save-results
   */
  async saveResults(req, res, next) {
    const connection = await pool.getConnection();

    try {
      const {
        sessionId,
        correctAnswers,
        incorrectAnswers,
        gameMode,
        timeUsed = 0,
        theme,
      } = req.body;

      console.log("🔍 DEBUG - Datos recibidos en save-results:", {
        sessionId,
        correctAnswersCount: correctAnswers?.length,
        incorrectAnswersCount: incorrectAnswers?.length,
        gameMode,
        timeUsed,
        theme,
      });

      // 1. Obtener datos de la sesión
      const session = await sessionRepository.findById(sessionId);

      if (!session) {
        connection.release();
        return res.status(404).json({ error: "Sesión no encontrada" });
      }

      const userId = session.user_id;
      const sessionTheme = session.theme;
      const finalTheme = theme || sessionTheme || "Tema desconocido";

      console.log("🎯 THEME DEBUG - Usando theme:", finalTheme);

      // 2. Calcular métricas
      const totalQuestions = correctAnswers.length + incorrectAnswers.length;
      const accuracy =
        totalQuestions > 0 ? (correctAnswers.length / totalQuestions) * 100 : 0;

      const sessionResults = {
        correctAnswers: correctAnswers.length,
        totalQuestions: totalQuestions,
        accuracy: accuracy,
        timeUsed: timeUsed || 0,
        gameMode: gameMode || "unknown",
        theme: finalTheme,
      };

      console.log("📊 DEBUG - sessionResults:", sessionResults);

      // 3. Calcular puntos
      const points = ScoringService.calculatePoints(sessionResults);
      console.log("💰 DEBUG - Puntos calculados:", points);

      // 4. Actualizar sesión
      await sessionRepository.updateSessionResults(
        sessionId,
        correctAnswers.length,
        timeUsed
      );

      // 5. Guardar respuestas individuales
      await sessionRepository.saveMultipleSessionChallenges(
        sessionId,
        correctAnswers,
        true
      );
      await sessionRepository.saveMultipleSessionChallenges(
        sessionId,
        incorrectAnswers,
        false
      );

      // 6. Guardar métricas y logros
      console.log("💾 DEBUG - Guardando en session_scores...");
      await ScoringService.saveSessionScore(
        userId,
        sessionId,
        sessionResults,
        points
      );

      console.log("📈 DEBUG - Actualizando user_metrics...");
      const newAchievements = await ScoringService.updateUserMetrics(
        userId,
        sessionResults,
        points,
        connection
      );

      console.log("🏆 DEBUG - Logros otorgados:", newAchievements);

      await connection.commit();
      console.log("✅ DEBUG - Todo guardado exitosamente");

      res.json({
        success: true,
        points: points,
        accuracy: accuracy,
        achievements: newAchievements,
      });
    } catch (error) {
      console.error("❌ ERROR en save-results:", error);
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  }

  /**
   * Obtiene los temas del usuario
   * GET /api/intensive-review/user-themes/:userId
   */
  async getUserThemes(req, res, next) {
    try {
      const { userId } = req.params;

      const themes = await challengeRepository.findUniqueThemesByUser(userId);

      res.json({ themes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Continúa una sesión de supervivencia con nuevos retos
   * POST /api/intensive-review/continue-survival
   */
  async continueSurvival(req, res, next) {
    try {
      const { sessionId, userId, theme, usedChallengeIds } = req.body;

      const newChallenges = await intensiveService.getContinuationChallenges(
        userId,
        theme,
        usedChallengeIds
      );

      if (newChallenges.length === 0) {
        return res.status(404).json({ error: "No hay más retos disponibles" });
      }

      res.json({
        newChallenges: newChallenges.map((c) => ({
          ...c,
          options: JSON.parse(c.options),
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IntensiveController();
