// routes/metrics.js
const express = require("express");
const router = express.Router();
const MetricsService = require("../services/metricsService"); // ← Import CORRECTO

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
