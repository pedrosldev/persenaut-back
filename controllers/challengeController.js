const pool = require('../config/db');
const { groq, MODELS, TEMPERATURE } = require('../config/groq');
const { generatePrompt, formatQuestion } = require('../services/promptService');

/**
 * Controlador para la generación de retos/preguntas
 */
class ChallengeController {
  /**
   * Genera un reto basado en tema y nivel
   * POST /api/challenges/generate
   */
  async generateChallenge(req, res, next) {
    const {
      theme,
      level,
      previousQuestions = [],
      userId,
      preferences = {},
    } = req.body;

    if (!theme || !level) {
      return res.status(400).json({ error: "Tema y nivel son requeridos" });
    }

    try {
      // 1. Generar el prompt usando el servicio del backend
      const prompt = generatePrompt(theme, level, previousQuestions);

      // 2. Llamar a GROQ
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODELS.GPT_OSS,
        temperature: TEMPERATURE.PRECISE,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error("Estructura de respuesta inesperada de Groq");
      }

      // 3. Formatear la pregunta usando el servicio del backend
      const formattedQuestion = formatQuestion(responseText);

      // 4. Guardar en la base de datos si hay userId
      if (userId) {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
          `INSERT INTO questions (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            theme,
            level,
            formattedQuestion.questionText,
            JSON.stringify(formattedQuestion.options),
            formattedQuestion.correctAnswer,
            responseText,
            userId,
            preferences.deliveryTime || "09:00:00",
            preferences.frequency || "daily",
            true,
          ]
        );
        connection.release();

        // 5. Devolver respuesta completa
        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          savedQuestionId: result.insertId,
          message: "Pregunta generada y guardada correctamente",
        });
      } else {
        // Si no hay userId, solo devolver la pregunta generada
        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          message: "Pregunta generada correctamente",
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Genera un reto usando Groq directamente (endpoint simplificado)
   * POST /api/challenges/groq
   */
  async generateWithGroq(req, res, next) {
    const { theme, level, previousQuestions = [] } = req.body;

    try {
      const prompt = generatePrompt(theme, level, previousQuestions);

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODELS.GPT_OSS,
      });

      res.json({ response: completion.choices[0]?.message?.content });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Genera un reto desde apuntes del usuario
   * POST /api/challenges/from-notes
   */
  async generateFromNotes(req, res, next) {
    const { userId, notes, theme, level, preferences = {} } = req.body;

    try {
      const { generatePromptFromNotes } = require('../services/promptService');
      
      // 1. Generar el prompt especializado para apuntes
      const prompt = generatePromptFromNotes(notes, theme, level);

      // 2. Llamar a Groq
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODELS.LLAMA,
        temperature: TEMPERATURE.BALANCED,
        max_tokens: 500,
      });

      const responseText = completion.choices[0]?.message?.content;

      if (!responseText) {
        throw new Error("No se recibió respuesta de Groq");
      }

      // 3. Formatear la pregunta
      const formattedQuestion = formatQuestion(responseText);

      // 4. Guardar en BD solo si hay userId y es programado
      if (userId && preferences.scheduleType === "scheduled") {
        const connection = await pool.getConnection();
        const [result] = await connection.execute(
          `INSERT INTO questions (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            theme,
            level,
            formattedQuestion.questionText,
            JSON.stringify(formattedQuestion.options),
            formattedQuestion.correctAnswer,
            responseText,
            userId,
            preferences.deliveryTime || "09:00:00",
            preferences.frequency,
            true,
          ]
        );
        connection.release();

        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          savedQuestionId: result.insertId,
          message: "Reto generado desde apuntes y guardado correctamente",
        });
      } else {
        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          message: "Reto generado desde apuntes correctamente",
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Guarda la respuesta de un usuario a un reto
   * POST /api/challenges/save-response
   */
  async saveResponse(req, res, next) {
    const { userId, questionId, selectedAnswer, responseTime } = req.body;

    try {
      const connection = await pool.getConnection();
      
      // Obtener la respuesta correcta
      const [question] = await connection.execute(
        'SELECT correct_answer FROM questions WHERE id = ?',
        [questionId]
      );

      if (question.length === 0) {
        connection.release();
        const error = new Error("Pregunta no encontrada");
        error.type = 'NotFoundError';
        throw error;
      }

      const isCorrect = selectedAnswer === question[0].correct_answer;

      // Guardar la respuesta
      const [result] = await connection.execute(
        `INSERT INTO user_responses (user_id, question_id, selected_answer, is_correct, response_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, questionId, selectedAnswer, isCorrect, responseTime]
      );

      connection.release();

      res.json({
        success: true,
        isCorrect,
        savedResponseId: result.insertId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Guarda respuesta del modo intensivo
   * POST /api/challenges/save-intensive-response
   */
  async saveIntensiveResponse(req, res, next) {
    const { sessionId, questionId, selectedAnswer, isCorrect, responseTime } = req.body;

    try {
      const connection = await pool.getConnection();
      
      // Verificar que la sesión existe
      const [session] = await connection.execute(
        'SELECT id FROM intensive_sessions WHERE id = ?',
        [sessionId]
      );

      if (session.length === 0) {
        connection.release();
        const error = new Error("Sesión intensiva no encontrada");
        error.type = 'NotFoundError';
        throw error;
      }

      // Guardar la respuesta individual
      const [result] = await connection.execute(
        `INSERT INTO intensive_responses (session_id, question_id, selected_answer, is_correct, response_time) 
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, questionId, selectedAnswer, isCorrect, responseTime]
      );

      connection.release();

      res.json({
        success: true,
        savedResponseId: result.insertId,
        message: "Respuesta intensiva guardada correctamente"
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChallengeController();
