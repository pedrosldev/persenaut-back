const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { generatePrompt, formatQuestion } = require("../services/promptService");
const ScoringService = require("../services/scoringService");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateAutoChallengesDirect(userId, theme, count, connection) {
  const generatedChallenges = [];

  for (let i = 0; i < count; i++) {
    try {
      const prompt = generatePrompt(theme, "avanzado", []);

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content;

      if (responseText) {
        const formattedQuestion = formatQuestion(responseText);

        // INSERT sin ID (autoincremental) y con todos los campos requeridos
        const [result] = await connection.execute(
          `INSERT INTO questions 
           (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, display_status, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            theme,
            "avanzado", // nivel fijo
            formattedQuestion.questionText,
            JSON.stringify(formattedQuestion.options),
            formattedQuestion.correctAnswer,
            responseText,
            userId, // el usuario logueado
            "09:00:00", // delivery_time por defecto
            "daily", // frequency por defecto
            false, // is_active = false para no activar el trigger
            "active", // display_status
          ]
        );

        // Obtener el ID autogenerado
        const insertedId = result.insertId;

        generatedChallenges.push({
          id: insertedId,
          theme: theme,
          question: formattedQuestion.questionText,
          options: JSON.stringify(formattedQuestion.options), // ← Mantener como string para consistencia
          correct_answer: formattedQuestion.correctAnswer,
          level: "avanzado",
        });

        console.log(`✅ Reto auto-generado ID: ${insertedId}`);
      }
    } catch (error) {
      console.error(`Error generando reto automático ${i + 1}:`, error);
    }
  }

  return generatedChallenges;
}

router.post("/start", async (req, res) => {
  try {
    const { userId, theme, gameMode = "timed" } = req.body; // ← Nuevo parámetro
    const sessionId = uuidv4();

    const connection = await pool.getConnection();

    // Determinar límite de preguntas según el modo
    const challengeLimit = gameMode === "survival" ? 15 : 10; // Más preguntas para supervivencia
    let challenges;
    // Obtener retos existentes del usuario
    const [existingChallenges] = await connection.execute(
      `SELECT id, theme, question, options, correct_answer 
       FROM questions 
       WHERE user_id = ? AND theme LIKE ? 
       ORDER BY RAND() LIMIT ?`,
      [userId, `%${theme}%`, challengeLimit]
    );
    challenges = existingChallenges;
    if (challenges.length === 0) {
      connection.release();
      return res.status(404).json({ error: "No hay retos para este tema" });
    }

    if (challenges.length < challengeLimit) {
      const needed = challengeLimit - challenges.length;
      console.log(`🔄 Generando ${needed} retos automáticamente`);

      const generatedChallenges = await generateAutoChallengesDirect(
        userId,
        theme,
        needed,
        connection
      );

      // Combinar retos existentes + nuevos generados
      challenges = [...challenges, ...generatedChallenges];
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

// router.post("/save-results", async (req, res) => {
//   try {
//     const { sessionId, correctAnswers, incorrectAnswers, gameMode, timeUsed } =
//       req.body;
//     const connection = await pool.getConnection();

//     // Actualizar sesión con tiempo usado si es modo ráfaga
//     if (gameMode === "timed" && timeUsed !== undefined) {
//       await connection.execute(
//         `UPDATE intensive_sessions
//          SET correct_answers = ?, time_used = ?, completed_at = NOW()
//          WHERE id = ?`,
//         [correctAnswers.length, timeUsed, sessionId]
//       );
//     } else {
//       await connection.execute(
//         `UPDATE intensive_sessions
//          SET correct_answers = ?, completed_at = NOW()
//          WHERE id = ?`,
//         [correctAnswers.length, sessionId]
//       );
//     }

//     // Guardar respuestas
//     for (const challengeId of correctAnswers) {
//       await connection.execute(
//         `INSERT INTO session_challenges (session_id, challenge_id, correct)
//          VALUES (?, ?, true)`,
//         [sessionId, challengeId]
//       );
//     }

//     for (const challengeId of incorrectAnswers) {
//       await connection.execute(
//         `INSERT INTO session_challenges (session_id, challenge_id, correct)
//          VALUES (?, ?, false)`,
//         [sessionId, challengeId]
//       );
//     }

//     connection.release();
//     res.json({ success: true });
//   } catch (error) {
//     console.error("Error saving results:", error);
//     res.status(500).json({ error: "Error al guardar resultados" });
//   }
// });

router.post("/save-results", async (req, res) => {
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
    const connection = await pool.getConnection();

    // 1. Obtener user_id de la sesión
    const [sessionData] = await connection.execute(
      `SELECT user_id FROM intensive_sessions WHERE id = ?`,
      [sessionId]
    );

    if (sessionData.length === 0) {
      connection.release();
      return res.status(404).json({ error: "Sesión no encontrada" });
    }

    const userId = sessionData[0].user_id;

    // 2. Calcular métricas
    const totalQuestions = correctAnswers.length + incorrectAnswers.length;
    const accuracy =
      totalQuestions > 0 ? (correctAnswers.length / totalQuestions) * 100 : 0;

    const sessionResults = {
      correctAnswers: correctAnswers.length,
      totalQuestions: correctAnswers.length + incorrectAnswers.length,
      accuracy:
        totalQuestions > 0 ? (correctAnswers.length / totalQuestions) * 100 : 0,
      timeUsed: timeUsed || 0, // ← Asegurar que no sea undefined
      gameMode: gameMode || "unknown", // ← Asegurar que no sea undefined
      theme: theme || "Sin tema", // ← Asegurar que no sea undefined
    };

    // 3. Calcular puntos
    const points = ScoringService.calculatePoints(sessionResults);

    // 4. Guardar en base de datos (tu código existente + nuevo)
    await connection.execute(
      `UPDATE intensive_sessions 
       SET correct_answers = ?, time_used = ?, completed_at = NOW() 
       WHERE id = ?`,
      [correctAnswers.length, timeUsed, sessionId]
    );

    // Guardar respuestas individuales...
    // (tu código existente para session_challenges)

    // 5. ✅ NUEVO: Guardar métricas usando el servicio
    await ScoringService.saveSessionScore(
      userId,
      sessionId,
      sessionResults,
      points
    );
    await ScoringService.updateUserMetrics(userId, sessionResults, points);

    connection.release();

    res.json({
      success: true,
      points: points,
      accuracy: accuracy,
    });
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
