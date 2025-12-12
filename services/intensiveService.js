const { groq, MODELS, TEMPERATURE, ADVANCED_PARAMS } = require('../config/groq');
const { generatePrompt, formatQuestion } = require('./promptService');
const challengeRepository = require('../repositories/challengeRepository');

/**
 * Servicio para lógica de negocio de modo intensivo
 * Gestiona la generación automática de desafíos y la selección de preguntas para sesiones intensivas
 */
class IntensiveService {
  /**
   * Genera retos automáticamente cuando no hay suficientes en la base de datos
   * @param {number} userId - ID del usuario
   * @param {string} theme - Tema para generar los desafíos
   * @param {number} count - Número de desafíos a generar
   * @returns {Promise<Array>} Array de desafíos generados con IDs asignados
   */
  async generateAutoChallenges(userId, theme, count) {
    const generatedChallenges = [];

    // 🔥 Obtener últimas 20 preguntas del tema para contexto negativo
    const recentQuestions = await challengeRepository.getRecentQuestionsByTheme(theme, 20);
    const previousQuestions = recentQuestions.map(q => q.question);

    // Determinar temperatura según tema
    const isTechnicalTheme = /linux|programación|ciencia|matemáticas|informática/i.test(theme);
    const temperature = isTechnicalTheme ? TEMPERATURE.PRECISE : TEMPERATURE.BALANCED;

    for (let i = 0; i < count; i++) {
      try {
        // Actualizar previousQuestions con las preguntas recién generadas
        const prompt = generatePrompt(theme, "avanzado", previousQuestions);

        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: MODELS.DEFAULT, // Usar modelo 70B
          temperature: temperature, // Temperatura baja según tema
          frequency_penalty: ADVANCED_PARAMS.frequency_penalty,
          presence_penalty: ADVANCED_PARAMS.presence_penalty,
          top_p: ADVANCED_PARAMS.top_p,
          seed: ADVANCED_PARAMS.seed(),
          max_tokens: 500,
        });

        const responseText = completion.choices[0]?.message?.content;

        if (responseText) {
          const formattedQuestion = formatQuestion(responseText);

          // Guardar usando repository
          const insertedId = await challengeRepository.save({
            theme,
            level: "avanzado",
            question: formattedQuestion.questionText,
            options: formattedQuestion.options,
            correctAnswer: formattedQuestion.correctAnswer,
            rawResponse: responseText,
            userId,
            deliveryTime: "09:00:00",
            frequency: "daily",
            isActive: false,
            displayStatus: "active"
          });

          generatedChallenges.push({
            id: insertedId,
            theme: theme,
            question: formattedQuestion.questionText,
            options: JSON.stringify(formattedQuestion.options),
            correct_answer: formattedQuestion.correctAnswer,
            level: "avanzado",
          });

          // ⚡ CRÍTICO: Agregar la pregunta recién generada a previousQuestions
          // para evitar repeticiones en las siguientes iteraciones
          previousQuestions.push(formattedQuestion.questionText);
          
          // Mantener solo las últimas 25 para no sobrecargar el prompt
          if (previousQuestions.length > 25) {
            previousQuestions.shift();
          }

          console.log(`✅ Reto auto-generado ID: ${insertedId}`);
        }
      } catch (error) {
        console.error(`Error generando reto automático ${i + 1}:`, error);
      }
    }

    return generatedChallenges;
  }

  /**
   * Obtiene retos para una sesión intensiva, generando automáticamente si es necesario
   * @param {number} userId - ID del usuario
   * @param {string} theme - Tema de la sesión
   * @param {number} limit - Límite de retos a obtener
   * @param {string} gameMode - Modo de juego ('normal', 'survival', 'time_attack')
   * @returns {Promise<Array>} Array de desafíos para la sesión
   */
  async getChallengesForSession(userId, theme, limit, gameMode) {
    // Determinar límite según modo de juego
    const challengeLimit = gameMode === "survival" ? 15 : 10;
    
    // Obtener retos existentes
    let challenges = await challengeRepository.findByThemeAndUser(userId, theme, challengeLimit);

    // Si no hay suficientes, generar automáticamente
    if (challenges.length < challengeLimit) {
      const needed = challengeLimit - challenges.length;
      console.log(`🔄 Generando ${needed} retos automáticamente`);

      const generatedChallenges = await this.generateAutoChallenges(
        userId,
        theme,
        needed
      );

      challenges = [...challenges, ...generatedChallenges];
    }

    return challenges;
  }

  /**
   * Obtiene retos adicionales para modo supervivencia, excluyendo los ya usados
   * @param {number} userId - ID del usuario
   * @param {string} theme - Tema de los desafíos
   * @param {Array<number>} usedChallengeIds - IDs de desafíos ya utilizados
   * @returns {Promise<Array>} Array de 5 desafíos adicionales
   */
  async getContinuationChallenges(userId, theme, usedChallengeIds) {
    const challenges = await challengeRepository.findByThemeExcludingIds(
      userId,
      theme,
      usedChallengeIds,
      5
    );

    return challenges;
  }
}

module.exports = new IntensiveService();
