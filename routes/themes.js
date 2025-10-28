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
router.delete("/:theme", async (req, res) => {
  try {
    const theme = decodeURIComponent(req.params.theme);
    const { userId } = req.body;

    console.log(
      `🗑️ ELIMINANDO TEMA COMPLETO: "${theme}" para usuario: ${userId}`
    );

    // Verificar que el tema existe
    const [themeQuestions] = await pool.execute(
      "SELECT COUNT(*) as count FROM questions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );

    if (themeQuestions[0].count === 0) {
      return res.status(404).json({
        success: false,
        error: `Tema "${theme}" no encontrado`,
      });
    }

    // ELIMINAR TODAS las preguntas del tema (todos los niveles)
    const [result] = await pool.execute(
      "DELETE FROM questions WHERE theme = ? AND user_id = ?",
      [theme, userId]
    );

    console.log(
      `✅ TEMA COMPLETO ELIMINADO: "${theme}" - ${result.affectedRows} preguntas borradas`
    );

    res.json({
      success: true,
      message: `Tema "${theme}" eliminado completamente`,
      deletedQuestions: result.affectedRows,
    });
  } catch (error) {
    console.error("❌ Error eliminando tema:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar el tema",
      details: error.message,
    });
  }
});

// Eliminar múltiples temas (opcional)
router.post("/delete-multiple", async (req, res) => {
  try {
    const { themes, userId } = req.body; // Cambiado de themesWithLevels a themes

    if (!themes || !Array.isArray(themes) || themes.length === 0) {
      return res.status(400).json({ error: "Lista de temas no válida" });
    }

    let totalDeleted = 0;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (const theme of themes) {
        const [result] = await connection.execute(
          "DELETE FROM questions WHERE theme = ? AND user_id = ?",
          [theme, userId]
        );
        totalDeleted += result.affectedRows;
        console.log(
          `🗑️ Eliminado tema completo: ${theme} - ${result.affectedRows} preguntas`
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: `${themes.length} temas eliminados correctamente`,
        deletedQuestions: totalDeleted,
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

// Eliminar un tema específico con nivel
router.delete('/:theme/:level', async (req, res) => {
  try {
    // Decodificar el tema y nivel de la URL
    const theme = decodeURIComponent(req.params.theme);
    const level = decodeURIComponent(req.params.level);
    const { userId } = req.body;

    console.log(`🗑️ Eliminando tema específico: "${theme}", nivel: "${level}", usuario: ${userId}`);

    // Verificar que el tema+nivel existe y tiene preguntas del usuario
    const [themeQuestions] = await pool.execute(
      'SELECT COUNT(*) as count FROM questions WHERE theme = ? AND level = ? AND user_id = ?',
      [theme, level, userId]
    );

    if (themeQuestions[0].count === 0) {
      return res.status(404).json({
        success: false,
        error: `Tema "${theme}" en nivel "${level}" no encontrado`
      });
    }

    // Eliminar todas las preguntas del tema en ese nivel específico
    const [result] = await pool.execute(
      'DELETE FROM questions WHERE theme = ? AND level = ? AND user_id = ?',
      [theme, level, userId]
    );

    console.log(`✅ Tema "${theme}" (nivel ${level}) eliminado - ${result.affectedRows} preguntas borradas`);

    res.json({
      success: true,
      message: `Tema "${theme}" (${level}) eliminado correctamente`,
      deletedQuestions: result.affectedRows
    });

  } catch (error) {
    console.error('❌ Error eliminando tema específico:', error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar el tema",
      details: error.message
    });
  }
});

module.exports = router;
