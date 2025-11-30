const { groq, MODELS, TEMPERATURE } = require('../config/groq');
const { generatePrompt, formatQuestion } = require('../services/promptService');
const challengeRepository = require('../repositories/challengeRepository');
const userRepository = require('../repositories/userRepository');

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
        const questionId = await challengeRepository.save({
          theme,
          level,
          question: formattedQuestion.questionText,
          options: formattedQuestion.options,
          correctAnswer: formattedQuestion.correctAnswer,
          rawResponse: responseText,
          userId,
          deliveryTime: preferences.deliveryTime,
          frequency: preferences.frequency,
          isActive: true,
        });

        // 5. Devolver respuesta completa
        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          savedQuestionId: questionId,
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
        const questionId = await challengeRepository.save({
          theme,
          level,
          question: formattedQuestion.questionText,
          options: formattedQuestion.options,
          correctAnswer: formattedQuestion.correctAnswer,
          rawResponse: responseText,
          userId,
          deliveryTime: preferences.deliveryTime,
          frequency: preferences.frequency,
          isActive: true,
        });

        return res.json({
          success: true,
          question: formattedQuestion,
          rawResponse: responseText,
          promptUsed: prompt,
          savedQuestionId: questionId,
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
      // Obtener la respuesta correcta
      const correctAnswer = await challengeRepository.getCorrectAnswer(questionId);

      if (!correctAnswer) {
        const error = new Error("Pregunta no encontrada");
        error.type = 'NotFoundError';
        throw error;
      }

      const isCorrect = selectedAnswer === correctAnswer;

      // Guardar la respuesta
      const responseId = await userRepository.saveUserResponse({
        userId,
        questionId,
        selectedAnswer,
        isCorrect,
        responseTime
      });

      res.json({
        success: true,
        isCorrect,
        savedResponseId: responseId
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
      const sessionRepository = require('../repositories/sessionRepository');
      
      // Verificar que la sesión existe
      const sessionExists = await sessionRepository.exists(sessionId);

      if (!sessionExists) {
        const error = new Error("Sesión intensiva no encontrada");
        error.type = 'NotFoundError';
        throw error;
      }

      // Guardar la respuesta individual
      const responseId = await userRepository.saveIntensiveResponse({
        sessionId,
        questionId,
        selectedAnswer,
        isCorrect,
        responseTime
      });

      res.json({
        success: true,
        savedResponseId: responseId,
        message: "Respuesta intensiva guardada correctamente"
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChallengeController();
