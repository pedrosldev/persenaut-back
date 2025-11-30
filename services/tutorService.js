const { groq, MODELS, TEMPERATURE } = require("../config/groq");

class TutorService {
  async generateTutorAdvice(userId, timeRange = "week") {
    try {
      // 1️⃣ Obtener métricas
      const userMetrics = await this.getUserMetrics(userId, timeRange);

      // 2️⃣ Construir prompt con las métricas
      const prompt = this.buildTutorPrompt(userMetrics);

      // 3️⃣ Enviar al modelo
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODELS.GPT_OSS,
        temperature: TEMPERATURE.BALANCED,
        max_tokens: 800,
      });

      const rawText = completion.choices[0]?.message?.content?.trim();

      if (!rawText) {
        console.warn("Tutor: respuesta vacía del modelo");
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
      return this.validateAndCompleteAdvice(parsedAdvice);
    } catch (error) {
      console.error("Error generating tutor advice:", error);
      return this.getFallbackAdvice();
    }
  }

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

  async getUserMetrics(userId, timeRange) {
    const metricsRepository = require("../repositories/metricsRepository");
    const sessionRepository = require("../repositories/sessionRepository");

    // 1. Obtener estadísticas de respuestas del usuario
    const responseStats = await metricsRepository.getUserResponseStats(userId);

    // 2. Obtener estadísticas del modo intensivo
    const intensiveStats = await metricsRepository.getIntensiveStats(userId);

    // 3. Obtener sesiones intensivas recientes
    const recentSessions = await sessionRepository.getRecentIntensiveSessions(userId, 5);

    // 4. Obtener temas con mayor dificultad
    const weakThemes = await metricsRepository.getWeakThemes(userId, 5);

    // Calcular métricas agregadas
    const totalQuestions = responseStats.reduce(
      (sum, stat) => sum + parseInt(stat.total_questions || 0),
      0
    );

    const totalCorrect = responseStats.reduce(
      (sum, stat) => sum + parseInt(stat.correct_answers || 0),
      0
    );

    const overallAccuracy =
      totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    return {
      responseStats,
      intensiveStats,
      recentSessions,
      weakThemes,
      timeRange,
      totalQuestions,
      overallAccuracy,
    };
  }

  // ACTUALIZA buildTutorPrompt para incluir datos intensivos
  buildTutorPrompt(metrics) {
    return `
IMPORTANTE: Devuelve SOLAMENTE un objeto JSON válido, sin texto adicional, sin markdown, sin code blocks.

Eres un tutor educativo inteligente. Analiza las métricas y proporciona recomendaciones.

MÉTRICAS:
- Precisión: ${metrics.overallAccuracy?.toFixed(1) || 0}%
- Total preguntas: ${metrics.totalQuestions || 0}
- Temas débiles: ${
      metrics.weakThemes?.map((t) => t.theme).join(", ") || "Ninguno"
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
