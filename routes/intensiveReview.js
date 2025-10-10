// routes/intensiveReview.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

// 1. Endpoint para iniciar sesión
router.post("/start", async (req, res) => {
  try {
    const { userId, theme } = req.body;
    const sessionId = uuidv4();

    const connection = await pool.getConnection();

    // Obtener retos existentes del usuario
    const [challenges] = await connection.execute(
      `SELECT id, theme, question, options, correct_answer 
       FROM questions 
       WHERE user_id = ? AND theme LIKE ? 
       ORDER BY RAND() LIMIT 10`,
      [userId, `%${theme}%`]
    );

    if (challenges.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No hay retos para este tema" });
    }

    // Guardar sesión
    await connection.execute(
      `INSERT INTO intensive_sessions (id, user_id, theme, total_questions) 
       VALUES (?, ?, ?, ?)`,
      [sessionId, userId, theme, challenges.length]
    );

    connection.release();

    res.json({
      sessionId,
      challenges: challenges.map((c) => ({
        ...c,
        options: JSON.parse(c.options),
      })),
    });
  } catch (error) {
    console.error("Error starting intensive session:", error);
    res.status(500).json({ error: "Error al iniciar sesión de repaso" });
  }
});

// 2. Endpoint para guardar resultados
router.post("/save-results", async (req, res) => {
  try {
    const { sessionId, correctAnswers, incorrectAnswers } = req.body;
    const connection = await pool.getConnection();

    // Actualizar sesión
    await connection.execute(
      `UPDATE intensive_sessions 
       SET correct_answers = ?, completed_at = NOW() 
       WHERE id = ?`,
      [correctAnswers.length, sessionId]
    );

    // Guardar respuestas
    for (const challengeId of correctAnswers) {
      await connection.execute(
        `INSERT INTO session_challenges (session_id, challenge_id, correct) 
         VALUES (?, ?, true)`,
        [sessionId, challengeId]
      );
    }

    for (const challengeId of incorrectAnswers) {
      await connection.execute(
        `INSERT INTO session_challenges (session_id, challenge_id, correct) 
         VALUES (?, ?, false)`,
        [sessionId, challengeId]
      );
    }

    connection.release();
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving results:", error);
    res.status(500).json({ error: "Error al guardar resultados" });
  }
});

// 3. Endpoint para obtener temas del usuario
router.get("/user-themes/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const connection = await pool.getConnection();

    const [themes] = await connection.execute(
      `SELECT DISTINCT theme FROM questions WHERE user_id = ? AND theme IS NOT NULL AND theme != ''`,
      [userId]
    );

    connection.release();
    res.json({ themes: themes.map((t) => t.theme) });
  } catch (error) {
    console.error("Error fetching user themes:", error);
    res.status(500).json({ error: "Error al obtener temas" });
  }
});

module.exports = router;
