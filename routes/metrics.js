// routes/metrics.js
const express = require("express");
const router = express.Router();
const MetricsService = require("../services/metricsService"); // ← Import CORRECTO

/**
 * @swagger
 * /metrics/user/{userId}/metrics/overall:
 *   get:
 *     summary: Obtener métricas generales del usuario
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Métricas generales del usuario
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserMetrics'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * Obtener métricas generales del usuario
 */
router.get("/user/:userId/metrics/overall", async (req, res) => {
  try {
    const { userId } = req.params;
    const metrics = await MetricsService.getUserOverallMetrics(userId);
    res.json(metrics || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /metrics/user/{userId}/metrics/sessions:
 *   get:
 *     summary: Obtener sesiones recientes del usuario
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Número máximo de sesiones a retornar
 *         example: 10
 *     responses:
 *       200:
 *         description: Lista de sesiones recientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/IntensiveSession'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * Obtener sesiones recientes del usuario
 */
router.get("/user/:userId/metrics/sessions", async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await MetricsService.getUserSessions(userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtener logros del usuario
 */
router.get("/user/:userId/metrics/achievements", async (req, res) => {
  try {
    const { userId } = req.params;
    const achievements = await MetricsService.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /metrics/user/{userId}/metrics/themes:
 *   get:
 *     summary: Obtener progreso por temas
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Progreso del usuario por tema
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     example: Matemáticas
 *                   total_sessions:
 *                     type: integer
 *                     example: 15
 *                   average_accuracy:
 *                     type: number
 *                     example: 85.5
 *                   total_points:
 *                     type: integer
 *                     example: 1200
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * Obtener progreso por temas
 */
router.get("/user/:userId/metrics/themes", async (req, res) => {
  try {
    const { userId } = req.params;
    const themes = await MetricsService.getUserThemeProgress(userId);
    res.json(themes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /metrics/user/{userId}/metrics/timeline:
 *   get:
 *     summary: Obtener evolución temporal del progreso
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Número de días a incluir en la línea de tiempo
 *         example: 30
 *     responses:
 *       200:
 *         description: Línea de tiempo del progreso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: 2025-11-30
 *                   sessions_count:
 *                     type: integer
 *                     example: 3
 *                   daily_accuracy:
 *                     type: number
 *                     example: 82.5
 *                   daily_points:
 *                     type: integer
 *                     example: 250
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * Obtener línea de tiempo de progreso
 */
router.get("/user/:userId/metrics/timeline", async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    const timeline = await MetricsService.getUserProgressTimeline(
      userId,
      parseInt(days)
    );
    res.json(timeline);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /metrics/user/{userId}/metrics/game-modes:
 *   get:
 *     summary: Obtener estadísticas por modo de juego
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Estadísticas por modo de juego
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   game_mode:
 *                     type: string
 *                     enum: [normal, survival, time_attack]
 *                     example: survival
 *                   total_sessions:
 *                     type: integer
 *                     example: 20
 *                   average_accuracy:
 *                     type: number
 *                     example: 78.5
 *                   average_points:
 *                     type: number
 *                     example: 125.5
 *                   total_time:
 *                     type: integer
 *                     description: Tiempo total en segundos
 *                     example: 3600
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
/**
 * Obtener estadísticas por modo de juego
 */
router.get("/user/:userId/metrics/game-modes", async (req, res) => {
  try {
    const { userId } = req.params;
    const stats = await MetricsService.getUserGameModeStats(userId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
