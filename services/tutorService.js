const { groq, MODELS, TEMPERATURE, ADVANCED_PARAMS } = require("../config/groq");

console.log("🚀 TutorService cargado - Versión con análisis de temas fuertes/débiles");

/**
 * Servicio para generar recomendaciones personalizadas del tutor IA
 * Analiza las métricas del usuario y proporciona consejos de estudio
 */
class TutorService {
  /**
   * Genera recomendaciones del tutor basadas en las métricas del usuario
   * @param {number} userId - ID del usuario
   * @param {string} timeRange - Rango temporal para análisis ('day', 'week', 'month')
   * @returns {Promise<Object>} Objeto con análisis, recomendaciones, objetivos y mensaje motivacional
   */
  async generateTutorAdvice(userId, timeRange = "week") {
    try {
      // 1️⃣ Obtener métricas
      const userMetrics = await this.getUserMetrics(userId, timeRange);
      
      console.log("🔍 DEBUG Tutor Metrics:", {
        totalQuestions: userMetrics.totalQuestions,
        strongThemes: userMetrics.strongThemes?.length,
        weakThemes: userMetrics.weakThemes?.length,
        strongThemesData: userMetrics.strongThemes,
        weakThemesData: userMetrics.weakThemes
      });

      // 2️⃣ Construir prompt con las métricas
      const prompt = this.buildTutorPrompt(userMetrics);
      
      console.log("📝 DEBUG Tutor Prompt:", prompt.substring(0, 500));

      // 3️⃣ Enviar al modelo
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODELS.LLAMA_INSTANT, // Cambiado a Llama 3.1 8B Instant
        temperature: TEMPERATURE.BALANCED, // Mantener balanceado para tutor (necesita coherencia)
        max_tokens: 800,
      });

      const rawText = completion.choices[0]?.message?.content?.trim();
      
      console.log("🤖 DEBUG Tutor Raw Response:", rawText?.substring(0, 300));

      if (!rawText) {
        console.warn("⚠️ Tutor: respuesta vacía del modelo");
        return this.getFallbackAdvice();
      }

      // 4️⃣ PARSER MEJORADO Y ROBUSTO
      let parsedAdvice;
      try {
        // Limpieza más agresiva del texto
        let cleaned = rawText
          .replace(/```json\n?|\n?```/g, "") // Remove code blocks
          .replace(/🤖 Tu Tutor IA[\s\S]*?📊 Análisis/g, "") // Remove UI text
          .replace(/"perro en el panel del frint[^"]*"/g, "") // Remove random text
          .trim();

        // Buscar el primer JSON válido (en caso de múltiples)
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleaned = jsonMatch[0];
        }

        // Arreglar problemas comunes de formato
        cleaned = cleaned
          .replace(/\n\s*\n/g, "\n") // Multiple newlines to single
          .replace(/,\s*\n\s*}/g, "\n}") // Trailing commas
          .replace(/,\s*\n\s*]/g, "\n]") // Trailing commas in arrays
          .replace(/\"\s*\n\s*"/g, '",\n"'); // Missing commas in objects

        parsedAdvice = JSON.parse(cleaned);

        console.log("✅ JSON parseado correctamente:", {
          analysis: parsedAdvice.analysis?.substring(0, 50) + "...",
          recommendations: parsedAdvice.recommendations?.length,
        });
      } catch (parseError) {
        console.warn(
          "Tutor: no se pudo parsear JSON, intentando recuperación...",
          parseError
        );
        console.log("Raw text problemático:", rawText.substring(0, 200));

        // Intentar extraer información aunque el JSON esté corrupto
        parsedAdvice = this.extractFromCorruptedJSON(rawText);
      }

      // 5️⃣ Validar y completar estructura
      const finalAdvice = this.validateAndCompleteAdvice(parsedAdvice);
      console.log("✅ DEBUG Tutor Final Advice:", {
        hasAnalysis: !!finalAdvice.analysis,
        strengthsCount: finalAdvice.strengths?.length,
        weaknessesCount: finalAdvice.weaknesses?.length,
        recommendationsCount: finalAdvice.recommendations?.length
      });
      return finalAdvice;
    } catch (error) {
      console.error("❌ Error generating tutor advice:", error);
      console.error("Stack:", error.stack);
      return this.getFallbackAdvice();
    }
  }

  /**
   * Intenta extraer información estructurada de un JSON corrupto o mal formateado
   * @param {string} rawText - Texto JSON corrupto desde el modelo de IA
   * @returns {Object} Objeto con datos extraídos (analysis, strengths, weaknesses, recommendations)
   */
  // Nuevo método para extraer datos de JSON corrupto
  extractFromCorruptedJSON(rawText) {
    const extracted = {
      analysis: "",
      strengths: [],
      weaknesses: [],
      recommendations: [],
      weekly_goals: [],
      encouragement: "",
    };

    try {
      // Extraer análisis
      const analysisMatch = rawText.match(/"analysis":\s*"([^"]*)"/);
      if (analysisMatch) {
        extracted.analysis = analysisMatch[1];
      }

      // Extraer fortalezas
      const strengthsMatch = rawText.match(/"strengths":\s*\[([^\]]*)\]/);
      if (strengthsMatch) {
        extracted.strengths = strengthsMatch[1]
          .split(",")
          .map((s) => s.replace(/["']/g, "").trim())
          .filter((s) => s.length > 0);
      }

      // Extraer recomendaciones (simplificado)
      const recMatches = rawText.match(/"title":\s*"([^"]*)"/g);
      if (recMatches) {
        extracted.recommendations = recMatches.map((match, index) => ({
          type: "practice_strategy",
          title: match.replace(/"title":\s*"/, "").replace(/"$/, ""),
          description: `Recomendación ${index + 1} extraída`,
          priority: index === 0 ? "high" : "medium",
        }));
      }

      // Si no se pudo extraer nada, usar el texto completo como análisis
      if (!extracted.analysis && rawText.length < 1000) {
        extracted.analysis = rawText;
      }
    } catch (error) {
      console.warn("Error en extracción de JSON corrupto:", error);
    }

    return extracted;
  }

  /**
   * Valida y completa la estructura del consejo del tutor con valores por defecto
   * @param {Object} advice - Objeto de consejo potencialmente incompleto
   * @returns {Object} Objeto de consejo validado y completo
   */
  // Método para validar y completar la estructura
  validateAndCompleteAdvice(advice) {
    const defaultAdvice = this.getFallbackAdvice();

    return {
      analysis: advice.analysis || defaultAdvice.analysis,
      strengths: Array.isArray(advice.strengths)
        ? advice.strengths
        : defaultAdvice.strengths,
      weaknesses: Array.isArray(advice.weaknesses)
        ? advice.weaknesses
        : defaultAdvice.weaknesses,
      recommendations: Array.isArray(advice.recommendations)
        ? advice.recommendations
        : defaultAdvice.recommendations,
      weekly_goals: Array.isArray(advice.weekly_goals)
        ? advice.weekly_goals
        : defaultAdvice.weekly_goals,
      encouragement: advice.encouragement || defaultAdvice.encouragement,
    };
  }

  /**
   * Obtiene las métricas completas del usuario desde los repositorios
   * @param {number} userId - ID del usuario
   * @param {string} timeRange - Rango temporal ('day', 'week', 'month')
   * @returns {Promise<Object>} Objeto con estadísticas de respuestas, sesiones intensivas y temas débiles
   */
  async getUserMetrics(userId, timeRange) {
    const metricsRepository = require("../repositories/metricsRepository");
    const sessionRepository = require("../repositories/sessionRepository");

    // 1. Obtener estadísticas de respuestas del usuario
    const responseStats = await metricsRepository.getUserResponseStats(userId, timeRange);

    // 2. Obtener estadísticas del modo intensivo
    const intensiveStats = await metricsRepository.getIntensiveStats(userId, timeRange);

    // 3. Obtener sesiones intensivas recientes
    const recentSessions = await sessionRepository.getRecentIntensiveSessions(userId, 5);

    // 4. Obtener temas con mayor dificultad Y fortalezas
    const weakThemes = await metricsRepository.getWeakThemes(userId, 5);
    const strongThemes = await metricsRepository.getStrongThemes(userId, 5);

    // Calcular métricas agregadas (DIARIOS + INTENSIVOS)
    const totalQuestionsDaily = responseStats.reduce(
      (sum, stat) => sum + parseInt(stat.total_questions || 0),
      0
    );

    const totalQuestionsIntensive = intensiveStats.reduce(
      (sum, stat) => sum + parseInt(stat.total_questions || 0),
      0
    );

    const totalQuestions = totalQuestionsDaily + totalQuestionsIntensive;

    const totalCorrectDaily = responseStats.reduce(
      (sum, stat) => sum + parseInt(stat.correct_answers || 0),
      0
    );

    const totalCorrectIntensive = intensiveStats.reduce(
      (sum, stat) => sum + parseInt(stat.correct_answers || 0),
      0
    );

    const totalCorrect = totalCorrectDaily + totalCorrectIntensive;

    const overallAccuracy =
      totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      responseStats,
      intensiveStats,
      recentSessions,
      weakThemes,
      strongThemes,
      timeRange,
      totalQuestions,
      totalQuestionsDaily,
      totalQuestionsIntensive,
      overallAccuracy,
    };
  }

  /**
   * Construye el prompt para el modelo de IA con las métricas del usuario
   * @param {Object} metrics - Métricas del usuario (precisión, preguntas, temas débiles)
   * @returns {string} Prompt formateado para el modelo de IA
   */
  // ACTUALIZA buildTutorPrompt para incluir datos intensivos
  buildTutorPrompt(metrics) {
    return `
IMPORTANTE: Devuelve SOLAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin code blocks.

Eres un tutor educativo inteligente. Analiza las métricas y proporciona recomendaciones.

MÉTRICAS:
- Precisión general: ${metrics.overallAccuracy?.toFixed(1) || 0}%
- Total preguntas respondidas: ${metrics.totalQuestions || 0}
  · Retos diarios: ${metrics.totalQuestionsDaily || 0}
  · Sesiones intensivas: ${metrics.totalQuestionsIntensive || 0}

TEMAS FUERTES (mejor rendimiento):
${metrics.strongThemes?.length > 0 
  ? metrics.strongThemes.map(t => `- ${t.theme}: ${parseFloat(t.success_rate).toFixed(1)}% de aciertos (${t.total_attempts} intentos)`).join('\n')
  : '- No hay suficientes datos'
}

TEMAS DÉBILES (necesitan refuerzo):
${metrics.weakThemes?.length > 0 
  ? metrics.weakThemes.map(t => `- ${t.theme}: ${parseFloat(t.success_rate).toFixed(1)}% de aciertos (${t.total_attempts} intentos)`).join('\n')
  : '- No hay suficientes datos'
}

RESPONDE EXCLUSIVAMENTE CON ESTE FORMATO JSON:
{
  "analysis": "Análisis breve aquí",
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"],
  "recommendations": [
    {
      "type": "theme_review",
      "title": "Título claro",
      "description": "Descripción práctica",
      "priority": "high"
    }
  ],
  "weekly_goals": ["Objetivo 1", "Objetivo 2"],
  "encouragement": "Mensaje motivacional"
}

No incluyas ningún otro texto fuera del JSON.`;
  }

  /**
   * Parsea la respuesta del tutor desde el modelo de IA
   * @param {string} response - Respuesta en texto del modelo
   * @returns {Object} Objeto parseado o consejo fallback si hay error
   * @deprecated Este método ya no se usa, parseado se realiza directamente en generateTutorAdvice
   */
  //   buildTutorPrompt(metrics) {
  //     return `
  // Eres un tutor educativo inteligente. Analiza las siguientes métricas de aprendizaje del estudiante y proporciona:

  // 1. Análisis de fortalezas y debilidades
  // 2. Recomendaciones específicas de temas a reforzar
  // 3. Estrategias de estudio personalizadas
  // 4. Objetivos a corto plazo

  // MÉTRICAS DEL ESTUDIANTE:
  // - Precisión general: ${metrics.overallAccuracy.toFixed(1)}%
  // - Total de preguntas respondidas: ${metrics.totalQuestions}
  // - Temas con mayor dificultad: ${metrics.weakThemes
  //       .map(
  //         (theme) =>
  //           `${theme.theme} (${theme.success_rate.toFixed(1)}% de aciertos)`
  //       )
  //       .join(", ")}

  // Proporciona una respuesta estructurada en JSON con este formato:
  // {
  //   "analysis": "Análisis general del progreso",
  //   "strengths": ["Fortaleza 1", "Fortaleza 2"],
  //   "weaknesses": ["Debilidad 1", "Debilidad 2"],
  //   "recommendations": [
  //     {
  //       "type": "theme_review|study_technique|practice_strategy",
  //       "title": "Título de la recomendación",
  //       "description": "Descripción detallada",
  //       "priority": "high|medium|low"
  //     }
  //   ],
  //   "weekly_goals": ["Objetivo 1", "Objetivo 2"],
  //   "encouragement": "Mensaje motivacional personalizado"
  // }

  // Sé específico, constructivo y motivador.`;
  //   }

  /**
   * Parsea la respuesta del tutor desde el modelo de IA
   * @param {string} response - Respuesta en texto del modelo
   * @returns {Object} Objeto parseado o consejo fallback si hay error
   * @deprecated Este método ya no se usa, parseado se realiza directamente en generateTutorAdvice
   */
  parseTutorResponse(response) {
    try {
      // Limpia el response si viene con markdown
      const cleanedResponse = response.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Error parsing tutor response:", error);
      console.log("Raw response:", response);
      return this.getFallbackAdvice();
    }
  }

  /**
   * Proporciona un consejo genérico cuando no hay suficientes datos o hay un error
   * @returns {Object} Consejo fallback con estructura completa
   */
  getFallbackAdvice() {
    return {
      analysis:
        "Estamos analizando tu progreso. Sigue completando retos para obtener recomendaciones personalizadas.",
      strengths: ["Compromiso con el aprendizaje"],
      weaknesses: ["Necesitamos más datos para identificar áreas de mejora"],
      recommendations: [
        {
          type: "practice_strategy",
          title: "Completa más retos",
          description:
            "Responde al menos 5 retos esta semana para obtener análisis más precisos",
          priority: "medium",
        },
      ],
      weekly_goals: ["Completar 5 retos de diferentes temas"],
      encouragement: "¡Cada reto te acerca a tus objetivos!",
    };
  }
}

module.exports = new TutorService();
