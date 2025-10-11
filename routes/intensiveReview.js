const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");


router.post("/start", async (req, res) => {
  try {
    const { userId, theme, gameMode = "timed" } = req.body; // ← Nuevo parámetro
    const sessionId = uuidv4();

    const connection = await pool.getConnection();

    // Determinar límite de preguntas según el modo
    const challengeLimit = gameMode === "survival" ? 15 : 10; // Más preguntas para supervivencia

    // Obtener retos existentes del usuario
    const [challenges] = await connection.execute(
      `SELECT id, theme, question, options, correct_answer 
       FROM questions 
       WHERE user_id = ? AND theme LIKE ? 
       ORDER BY RAND() LIMIT ?`,
      [userId, `%${theme}%`, challengeLimit]
    );

    if (challenges.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No hay retos para este tema" });
    }

    // Guardar sesión CON MODO DE JUEGO
    await connection.execute(
      `INSERT INTO intensive_sessions (id, user_id, theme, total_questions, game_mode) 
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, userId, theme, challenges.length, gameMode]
    );

    connection.release();

    res.json({
      sessionId,
      gameMode, // ← Devolver el modo al frontend
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


router.post("/save-results", async (req, res) => {
  try {
    const { sessionId, correctAnswers, incorrectAnswers, gameMode, timeUsed } =
      req.body;
    const connection = await pool.getConnection();

    // Actualizar sesión con tiempo usado si es modo ráfaga
    if (gameMode === "timed" && timeUsed !== undefined) {
      await connection.execute(
        `UPDATE intensive_sessions 
         SET correct_answers = ?, time_used = ?, completed_at = NOW() 
         WHERE id = ?`,
        [correctAnswers.length, timeUsed, sessionId]
      );
    } else {
      await connection.execute(
        `UPDATE intensive_sessions 
         SET correct_answers = ?, completed_at = NOW() 
         WHERE id = ?`,
        [correctAnswers.length, sessionId]
      );
    }

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


router.post("/continue-survival", async (req, res) => {
  try {
    const { sessionId, userId, theme, usedChallengeIds } = req.body;

    const connection = await pool.getConnection();

    // Generar nuevos retos (excluyendo los ya usados)
    const [newChallenges] = await connection.execute(
      `SELECT id, theme, question, options, correct_answer 
       FROM questions 
       WHERE user_id = ? AND theme LIKE ? 
       AND id NOT IN (?)
       ORDER BY RAND() 
       LIMIT 5`, // Nueva tanda de 5 retos
      [
        userId,
        `%${theme}%`,
        usedChallengeIds.length > 0 ? usedChallengeIds : [0],
      ]
    );

    if (newChallenges.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No hay más retos disponibles" });
    }

    connection.release();

    res.json({
      newChallenges: newChallenges.map((c) => ({
        ...c,
        options: JSON.parse(c.options),
      })),
    });
  } catch (error) {
    console.error("Error continuing survival session:", error);
    res
      .status(500)
      .json({ error: "Error al continuar sesión de supervivencia" });
  }
});

module.exports = router;
