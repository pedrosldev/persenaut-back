// services/schedulerService.js
const cron = require("node-cron");
const pool = require("../config/db.js");
const axios = require("axios");

class SchedulerService {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Ejecutar cada minuto
    cron.schedule("* * * * *", async () => {
      await this.checkScheduledChallenges();
    });
    console.log(
      "⏰ Cron iniciado - Verificando cada minuto (SOLO INSERCIONES)"
    );
  }

  async checkScheduledChallenges() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const connection = await pool.getConnection();

      // Buscar retos programados PARA AHORA
      const [dueChallenges] = await connection.execute(
        `SELECT id, user_id, theme, level, frequency, delivery_time 
                 FROM questions 
                 WHERE next_delivery <= NOW() 
                 AND is_active = true`,
        []
      );
      connection.release();

      console.log(`📋 Retos a generar: ${dueChallenges.length}`);

      // Generar NUEVO reto para cada programación
      for (const challenge of dueChallenges) {
        await this.generateNewChallenge(challenge);
      }
    } catch (error) {
      console.error("❌ Error en el cron:", error);
    } finally {
      this.isRunning = false;
    }
  }

  async generateNewChallenge(challenge) {
    const { id, user_id, theme, level, frequency, delivery_time } = challenge;

    try {
      console.log(`🔄 Generando NUEVO reto para usuario ${user_id}`);
      const connection = await pool.getConnection();
      // Usar tu endpoint existente
      const response = await axios.post(
        `http://localhost:${process.env.PORT || 3000}/api/reto`,
        {
          theme: theme,
          level: level,
          userId: user_id,
          preferences: {
            deliveryTime: delivery_time,
            frequency: frequency,
            isActive: true,
          },
          previousQuestions: [],
        }
      );

      if (response.data.success) {
        console.log(`✅ NUEVO reto guardado: ${response.data.savedQuestionId}`);
        await connection.execute(
          `UPDATE questions SET is_active = false WHERE id = ?`,
          [id]
        );

        await connection.commit();
        console.log(
          `🔴 Registro ${id} desactivado | ✅ Trigger manejará próxima programación`
        );
      }
    } catch (error) {
      console.error(
        `❌ Error generando reto para usuario ${user_id}:`,
        error.message
      );
    }
  }
}

module.exports = new SchedulerService();
