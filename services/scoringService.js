// services/scoringService.js - Versión corregida
const pool = require("../config/db");

const ScoringService = {
  calculatePoints: (sessionResults) => {
    const basePoints = (sessionResults.correctAnswers || 0) * 10;
    const accuracyBonus = (sessionResults.accuracy || 0) >= 80 ? 50 : 0;
    const timeBonus =
      sessionResults.gameMode === "timed"
        ? Math.max(0, 100 - (sessionResults.timeUsed || 0))
        : 0;

    return basePoints + accuracyBonus + timeBonus;
  },

  saveSessionScore: async (userId, sessionId, sessionResults, points) => {
    const connection = await pool.getConnection();

    try {
      // Asegurar que ningún valor sea undefined
         console.log("🔎 DEBUG scoringService - Valores recibidos:", {
           userId,
           sessionId,
           points,
           accuracy: sessionResults.accuracy,
           timeUsed: sessionResults.timeUsed,
           gameMode: sessionResults.gameMode,
           theme: sessionResults.theme,
         });
      const safeValues = [
        userId,
        sessionId,
        points || 0,
        sessionResults.accuracy || 0,
        sessionResults.timeUsed || 0,
        sessionResults.gameMode || "unknown",
        sessionResults.theme || "Sin tema",
      ];

      await connection.execute(
        `INSERT INTO session_scores 
         (user_id, session_id, points_earned, accuracy, time_spent, game_mode, theme) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        safeValues
      );
    } finally {
      connection.release();
    }
  },

  updateUserMetrics: async (userId, sessionResults, points) => {
    const connection = await pool.getConnection();

    try {
      // Valores seguros para evitar undefined
      const safePoints = points || 0;
      const safeCorrectAnswers = sessionResults.correctAnswers || 0;
      const safeTimeUsed = sessionResults.timeUsed || 0;
      const safeAccuracy = sessionResults.accuracy || 0;

      await connection.execute(
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
          safePoints,
          safeCorrectAnswers,
          safeTimeUsed,
          safeAccuracy,
          safePoints,
          safeCorrectAnswers,
          safeTimeUsed,
          safeAccuracy,
        ]
      );
    } finally {
      connection.release();
    }
  },
};

module.exports = ScoringService;
