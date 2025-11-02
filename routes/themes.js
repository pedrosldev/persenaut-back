const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener todos los temas del usuario con estadísticas
router.get("/user/:userId", async (req, res) => {
  console.log(
    "📥 GET /api/themes/user/:userId llamado con userId:",
    req.params.userId
  );

  try {
    const { userId } = req.params;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "ID de usuario no válido",
      });
    }

    console.log("🔍 Buscando temas para usuario:", userId);

    const [themes] = await pool.execute(
      `SELECT 
        theme,
        COUNT(*) as total_questions,
        level,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
       FROM questions 
       WHERE user_id = ? 
       GROUP BY theme, level
       ORDER BY last_created DESC`,
      [userId]
    );

    console.log("✅ Temas encontrados:", themes.length);

    const formattedThemes = themes.map((theme) => ({
      ...theme,
      accuracy: 0,
      correct_answers: 0,
      total_questions: parseInt(theme.total_questions),
    }));

    res.json({
      success: true,
      themes: formattedThemes,
    });
  } catch (error) {
    console.error("❌ Error en GET /api/themes/user/:userId:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor al obtener los temas",
      details: error.message,
    });
  }
});

// ELIMINAR TODO EL TEMA (FUNCIONABA)
// router.delete("/:theme", async (req, res) => {
//   try {
//     const theme = decodeURIComponent(req.params.theme);
//     const { userId } = req.body;

//     console.log(
//       `🗑️ ELIMINANDO TEMA COMPLETO: "${theme}" para usuario: ${userId}`
//     );

//     // Verificar que el tema existe
//     const [themeQuestions] = await pool.execute(
//       "SELECT COUNT(*) as count FROM questions WHERE theme = ? AND user_id = ?",
//       [theme, userId]
//     );

//     if (themeQuestions[0].count === 0) {
//       return res.status(404).json({
//         success: false,
//         error: `Tema "${theme}" no encontrado`,
//       });
//     }

//     // ELIMINAR TODAS las preguntas del tema (todos los niveles)
//     const [result] = await pool.execute(
//       "DELETE FROM questions WHERE theme = ? AND user_id = ?",
//       [theme, userId]
//     );

//     console.log(
//       `✅ TEMA COMPLETO ELIMINADO: "${theme}" - ${result.affectedRows} preguntas borradas`
//     );

//     res.json({
//       success: true,
//       message: `Tema "${theme}" eliminado completamente`,
//       deletedQuestions: result.affectedRows,
//     });
//   } catch (error) {
//     console.error("❌ Error eliminando tema:", error);
//     res.status(500).json({
//       success: false,
//       error: "Error al eliminar el tema",
//       details: error.message,
//     });
//   }
// });
router.delete("/:theme", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const theme = decodeURIComponent(req.params.theme);
    const { userId } = req.body;

    console.log(`🔍 VALORES RECIBIDOS:`);
    console.log(`   - Theme: "${theme}" (longitud: ${theme.length})`);
    console.log(`   - UserId: ${userId}`);

    // 🔍 VERIFICAR QUÉ HAY EN INTENSIVE_SESSIONS
    const [dbThemes] = await connection.execute(
      "SELECT DISTINCT theme FROM intensive_sessions WHERE user_id = ?",
      [userId]
    );
    console.log(
      `📋 Temas en intensive_sessions:`,
      dbThemes.map((t) => `"${t.theme}"`)
    );

    // 🔍 VERIFICAR SI EXISTE EXACTAMENTE
    const [exactMatch] = await connection.execute(
      "SELECT COUNT(*) as count FROM intensive_sessions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );
    console.log(
      `🎯 Coincidencia exacta en intensive_sessions: ${exactMatch[0].count}`
    );

    // Verificar que el tema existe en questions
    const [themeQuestions] = await connection.execute(
      "SELECT COUNT(*) as count FROM questions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );

    if (themeQuestions[0].count === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: `Tema "${theme}" no encontrado`,
      });
    }

    // Eliminar sesiones intensivas
    const [sessionResult] = await connection.execute(
      "DELETE FROM intensive_sessions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );
    console.log(`🗑️ Sesiones eliminadas: ${sessionResult.affectedRows}`);

    // Eliminar preguntas
    const [questionsResult] = await connection.execute(
      "DELETE FROM questions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );
    console.log(`🗑️ Preguntas eliminadas: ${questionsResult.affectedRows}`);

    await connection.commit();

    res.json({
      success: true,
      message: `Tema "${theme}" eliminado completamente`,
      deletedQuestions: questionsResult.affectedRows,
      deletedSessions: sessionResult.affectedRows,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error eliminando tema:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar el tema",
      details: error.message,
    });
  } finally {
    connection.release();
  }
});

router.post("/delete-multiple", async (req, res) => {
  try {
    const { themes, userId } = req.body;

    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return res.status(400).json({ error: "Lista de temas no válida" });
    }

    let totalDeletedQuestions = 0;
    let totalDeletedSessions = 0; // ⬅️ NUEVO
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const theme of themes) {
        // ⬅️ ELIMINAR SESIONES INTENSIVAS PRIMERO
        const [sessionResult] = await connection.execute(
          "DELETE FROM intensive_sessions WHERE theme = ? AND user_id = ?",
          [theme, userId]
        );
        totalDeletedSessions += sessionResult.affectedRows;
        console.log(
          `🗑️ Sesiones eliminadas para "${theme}": ${sessionResult.affectedRows}`
        );

        // LUEGO ELIMINAR PREGUNTAS
        const [questionsResult] = await connection.execute(
          "DELETE FROM questions WHERE theme = ? AND user_id = ?",
          [theme, userId]
        );
        totalDeletedQuestions += questionsResult.affectedRows;
        console.log(
          `🗑️ Preguntas eliminadas para "${theme}": ${questionsResult.affectedRows}`
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: `${themes.length} temas eliminados correctamente`,
        deletedQuestions: totalDeletedQuestions,
        deletedSessions: totalDeletedSessions, // ⬅️ NUEVO
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("❌ Error eliminando temas múltiples:", error);
    res.status(500).json({
      error: "Error al eliminar los temas",
      details: error.message,
    });
  }
});

router.delete("/:theme/:level", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const theme = decodeURIComponent(req.params.theme);
    const level = decodeURIComponent(req.params.level);
    const { userId } = req.body;

    console.log(
      `🗑️ Eliminando tema específico: "${theme}", nivel: "${level}", usuario: ${userId}`
    );

    // Verificar que el tema+nivel existe
    const [themeQuestions] = await connection.execute(
      "SELECT COUNT(*) as count FROM questions WHERE theme = ? AND level = ? AND user_id = ?",
      [theme, level, userId]
    );

    if (themeQuestions[0].count === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: `Tema "${theme}" en nivel "${level}" no encontrado`,
      });
    }

    // ⬅️ PRIMERO: Eliminar SESIONES INTENSIVAS del tema (SIEMPRE)
    const [sessionResult] = await connection.execute(
      "DELETE FROM intensive_sessions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );
    console.log(
      `🗑️ Sesiones intensivas eliminadas: ${sessionResult.affectedRows}`
    );

    // ⬅️ SEGUNDO: Eliminar preguntas del nivel específico
    const [questionsResult] = await connection.execute(
      "DELETE FROM questions WHERE theme = ? AND level = ? AND user_id = ?",
      [theme, level, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Tema "${theme}" (${level}) eliminado correctamente`,
      deletedQuestions: questionsResult.affectedRows,
      deletedSessions: sessionResult.affectedRows, // Ahora siempre tendrá valor
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error eliminando tema específico:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar el tema",
      details: error.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
