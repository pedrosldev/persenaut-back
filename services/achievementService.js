const AchievementService = {
  checkAndAwardAchievements: async (
    userId,
    sessionResults,
    connection,
    newPoints = 0
  ) => {
    const newAchievements = [];

    try {
      // Obtener métricas actuales del usuario
      const [userMetrics] = await connection.execute(
        `SELECT total_sessions, total_points, total_correct_answers, average_accuracy 
         FROM user_metrics WHERE user_id = ?`,
        [userId]
      );

      const metrics = userMetrics[0] || {
        total_sessions: 0,
        total_points: 0,
        total_correct_answers: 0,
        average_accuracy: 0,
      };

      console.log("🏆 DEBUG - Métricas actuales:", metrics);
      console.log("🏆 DEBUG - Resultados de sesión:", sessionResults);
      console.log("🏆 DEBUG - Puntos nuevos:", newPoints);

      // ✅ CORREGIDO: Calcular métricas después de esta sesión
      const totalSessionsAfter = metrics.total_sessions + 1;
      const totalPointsAfter = metrics.total_points + newPoints;

      // ✅ NUEVO: Debug específico para point_master
      console.log("🔍 DEBUG point_master - Verificación:", {
        puntos_totales_antes: metrics.total_points,
        puntos_nueva_sesion: newPoints,
        puntos_totales_despues: totalPointsAfter,
        deberia_otorgar: totalPointsAfter >= 100 && metrics.total_points < 100,
      });

      // LOGRO: Primera sesión - SOLO si era la primera
      if (metrics.total_sessions === 0) {
        const achievement = {
          achievement_id: "first_session",
          achievement_name: "🚀 Primeros Pasos",
          achievement_description: "Completaste tu primera sesión de repaso",
          points_earned: 50,
        };

        const [existing] = await connection.execute(
          `SELECT id FROM user_achievements 
           WHERE user_id = ? AND achievement_id = ?`,
          [userId, achievement.achievement_id]
        );

        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO user_achievements 
             (user_id, achievement_id, achievement_name, achievement_description, points_earned) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              achievement.achievement_id,
              achievement.achievement_name,
              achievement.achievement_description,
              achievement.points_earned,
            ]
          );
          newAchievements.push(achievement);
          console.log("✅ Logro otorgado: Primeros Pasos");
        }
      }

      // LOGRO: Precisión perfecta - EXCLUIR modo supervivencia si falló
      if (sessionResults.gameMode === "survival") {
        if (
          sessionResults.correctAnswers === sessionResults.totalQuestions &&
          sessionResults.totalQuestions >= 3
        ) {
          const achievement = {
            achievement_id: "survival_master",
            achievement_name: "🔝 Maestro del Supervivencia",
            achievement_description:
              "Completaste un modo supervivencia sin fallar",
            points_earned: 200,
          };

          const [existing] = await connection.execute(
            `SELECT id FROM user_achievements 
             WHERE user_id = ? AND achievement_id = ?`,
            [userId, achievement.achievement_id]
          );

          if (existing.length === 0) {
            await connection.execute(
              `INSERT INTO user_achievements 
               (user_id, achievement_id, achievement_name, achievement_description, points_earned) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                userId,
                achievement.achievement_id,
                achievement.achievement_name,
                achievement.achievement_description,
                achievement.points_earned,
              ]
            );
            newAchievements.push(achievement);
            console.log("✅ Logro otorgado: Maestro del Supervivencia");
          }
        }
      } else {
        if (
          sessionResults.accuracy === 100 &&
          sessionResults.totalQuestions >= 5
        ) {
          const achievement = {
            achievement_id: "perfect_accuracy",
            achievement_name: "⭐ ¡Perfecto!",
            achievement_description: "Lograste 100% de precisión en una sesión",
            points_earned: 100,
          };

          const [existing] = await connection.execute(
            `SELECT id FROM user_achievements 
             WHERE user_id = ? AND achievement_id = ?`,
            [userId, achievement.achievement_id]
          );

          if (existing.length === 0) {
            await connection.execute(
              `INSERT INTO user_achievements 
               (user_id, achievement_id, achievement_name, achievement_description, points_earned) 
               VALUES (?, ?, ?, ?, ?)`,
              [
                userId,
                achievement.achievement_id,
                achievement.achievement_name,
                achievement.achievement_description,
                achievement.points_earned,
              ]
            );
            newAchievements.push(achievement);
            console.log("✅ Logro otorgado: ¡Perfecto!");
          }
        }
      }

      // LOGRO: 5 sesiones completadas
      if (totalSessionsAfter >= 5 && metrics.total_sessions < 5) {
        const achievement = {
          achievement_id: "dedicated_learner",
          achievement_name: "📚 Aprendiz Constante",
          achievement_description: "Completaste 5 sesiones de repaso",
          points_earned: 150,
        };

        const [existing] = await connection.execute(
          `SELECT id FROM user_achievements 
           WHERE user_id = ? AND achievement_id = ?`,
          [userId, achievement.achievement_id]
        );

        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO user_achievements 
             (user_id, achievement_id, achievement_name, achievement_description, points_earned) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              achievement.achievement_id,
              achievement.achievement_name,
              achievement.achievement_description,
              achievement.points_earned,
            ]
          );
          newAchievements.push(achievement);
          console.log("✅ Logro otorgado: Aprendiz Constante");
        }
      }

      // LOGRO: 100 puntos totales
      if (totalPointsAfter >= 100 && metrics.total_points < 100) {
        const achievement = {
          achievement_id: "point_master",
          achievement_name: "💰 Maestro de Puntos",
          achievement_description: "Alcanzaste 100 puntos totales",
          points_earned: 50,
        };

        const [existing] = await connection.execute(
          `SELECT id FROM user_achievements 
           WHERE user_id = ? AND achievement_id = ?`,
          [userId, achievement.achievement_id]
        );

        if (existing.length === 0) {
          await connection.execute(
            `INSERT INTO user_achievements 
             (user_id, achievement_id, achievement_name, achievement_description, points_earned) 
             VALUES (?, ?, ?, ?, ?)`,
            [
              userId,
              achievement.achievement_id,
              achievement.achievement_name,
              achievement.achievement_description,
              achievement.points_earned,
            ]
          );
          newAchievements.push(achievement);
          console.log("✅ Logro otorgado: Maestro de Puntos");
        }
      }

      console.log(
        "🏆 DEBUG - Logros otorgados:",
        newAchievements.length,
        newAchievements
      );
      return newAchievements;
    } catch (error) {
      console.error("❌ Error en checkAndAwardAchievements:", error);
      return [];
    }
  },
};

module.exports = AchievementService;
