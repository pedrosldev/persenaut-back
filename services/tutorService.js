const groq = new (require("groq-sdk"))({ apiKey: process.env.GROQ_API_KEY });

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
        model: "openai/gpt-oss-120b",
        temperature: 0.7,
        max_tokens: 800,
      });

      const rawText = completion.choices[0]?.message?.content?.trim();

      if (!rawText) {
        console.warn("Tutor: respuesta vacía del modelo");
        return this.getFallbackAdvice();
      }

      // 4️⃣ Intentar parsear si viene en JSON
      let parsedAdvice;
      try {
        const cleaned = rawText.replace(/```json\n?|\n?```/g, "").trim();
        parsedAdvice = JSON.parse(cleaned);
      } catch (parseError) {
        console.warn("Tutor: no se pudo parsear JSON, devolviendo texto plano");
        parsedAdvice = {
          analysis: rawText,
          strengths: [],
          weaknesses: [],
          recommendations: [],
          weekly_goals: [],
          encouragement: "¡Sigue mejorando cada día! 🚀",
        };
      }

      // 5️⃣ Validar estructura mínima
      return {
        analysis: parsedAdvice.analysis || "Sin análisis disponible.",
        strengths: parsedAdvice.strengths || [],
        weaknesses: parsedAdvice.weaknesses || [],
        recommendations: parsedAdvice.recommendations || [],
        weekly_goals: parsedAdvice.weekly_goals || [],
        encouragement:
          parsedAdvice.encouragement ||
          "¡Cada paso te acerca más a tu objetivo! 💪",
      };
    } catch (error) {
      console.error("Error generating tutor advice:", error);
      return this.getFallbackAdvice();
    }
  }

  // services/tutorService.js - ACTUALIZA getUserMetrics
  async getUserMetrics(userId, timeRange) {
    const connection = await require("../config/db").getConnection();

    // 1. Obtener estadísticas de retos normales (ya lo tienes)
    const [responseStats] = await connection.execute(
      `
    SELECT 
      COUNT(*) as total_questions,
      SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
      AVG(CASE WHEN ur.is_correct = 1 THEN ur.response_time ELSE NULL END) as avg_correct_time,
      AVG(CASE WHEN ur.is_correct = 0 THEN ur.response_time ELSE NULL END) as avg_incorrect_time,
      q.theme,
      COUNT(DISTINCT q.theme) as themes_count
    FROM user_responses ur
    JOIN questions q ON ur.question_id = q.id
    WHERE ur.user_id = ? 
      AND ur.created_at >= DATE_SUB(NOW(), INTERVAL 1 ${timeRange.toUpperCase()})
    GROUP BY q.theme
    ORDER BY correct_answers ASC
  `,
      [userId]
    );

    // 2. ✅ NUEVO: Obtener estadísticas del modo intensivo
    const [intensiveStats] = await connection.execute(
      `
    SELECT 
      isess.theme,
      isess.game_mode,
      COUNT(*) as total_questions,
      SUM(CASE WHEN ir.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
      AVG(ir.response_time) as avg_response_time,
      (SUM(CASE WHEN ir.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
    FROM intensive_responses ir
    JOIN intensive_sessions isess ON ir.session_id = isess.id
    WHERE isess.user_id = ?
      AND ir.created_at >= DATE_SUB(NOW(), INTERVAL 1 ${timeRange.toUpperCase()})
    GROUP BY isess.theme, isess.game_mode
    ORDER BY success_rate ASC
  `,
      [userId]
    );

    // 3. ✅ NUEVO: Obtener sesiones intensivas recientes
    const [recentSessions] = await connection.execute(
      `
    SELECT 
      theme,
      game_mode,
      total_questions,
      correct_answers,
      (correct_answers / total_questions) * 100 as accuracy,
      time_used,
      created_at
    FROM intensive_sessions 
    WHERE user_id = ?
    ORDER BY created_at DESC 
    LIMIT 5
  `,
      [userId]
    );

    // 4. Obtener temas con mayor dificultad (ya lo tienes)
    const [weakThemes] = await connection.execute(
      `
    SELECT 
      q.theme,
      COUNT(*) as total_attempts,
      SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) as correct_attempts,
      (SUM(CASE WHEN ur.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
    FROM user_responses ur
    JOIN questions q ON ur.question_id = q.id
    WHERE ur.user_id = ?
    GROUP BY q.theme
    HAVING total_attempts >= 3
    ORDER BY success_rate ASC
    LIMIT 5
  `,
      [userId]
    );

    connection.release();

    return {
      responseStats,
      intensiveStats, // ← NUEVO
      recentSessions, // ← NUEVO
      weakThemes,
      timeRange,
      totalQuestions: responseStats.reduce(
        (sum, stat) => sum + parseInt(stat.total_questions),
        0
      ),
      overallAccuracy:
        responseStats.length > 0
          ? (responseStats.reduce(
              (sum, stat) => sum + parseInt(stat.correct_answers),
              0
            ) /
              responseStats.reduce(
                (sum, stat) => sum + parseInt(stat.total_questions),
                0
              )) *
            100
          : 0,
    };
  }

  // ACTUALIZA buildTutorPrompt para incluir datos intensivos
  buildTutorPrompt(metrics) {
    const intensiveStats = metrics.intensiveStats || [];
    const recentSessions = metrics.recentSessions || [];

    let intensiveAnalysis = "";

    if (intensiveStats.length > 0) {
      intensiveAnalysis = `
ANÁLISIS DE MODO INTENSIVO:
${intensiveStats
  .map((stat) => {
    const rate = parseFloat(stat.success_rate) || 0;
    const avgTime = parseFloat(stat.avg_response_time) || 0;
    const correct = parseInt(stat.correct_answers) || 0;
    const total = parseInt(stat.total_questions) || 0;
    return `- ${stat.theme} (${
      stat.game_mode
    }): ${correct}/${total} correctas (${rate.toFixed(1)}%), tiempo promedio: ${
      avgTime ? avgTime.toFixed(1) + "s" : "N/A"
    }`;
  })
  .join("\n")}
    `.trim();
    }

    let recentSessionsInfo = "";
    if (recentSessions.length > 0) {
      recentSessionsInfo = `
SESIONES INTENSIVAS RECIENTES:
${recentSessions
  .map((session) => {
    const accuracy = parseFloat(session.accuracy) || 0;
    return `- ${session.theme} (${session.game_mode}): ${accuracy.toFixed(
      1
    )}% precisión, ${
      session.time_used ? session.time_used + "s" : "sin tiempo"
    }`;
  })
  .join("\n")}
    `.trim();
    }

    // 🔒 Conversión segura también para weakThemes
    const weakThemesInfo =
      metrics.weakThemes && metrics.weakThemes.length > 0
        ? metrics.weakThemes
            .map((theme) => {
              const rate = parseFloat(theme.success_rate) || 0;
              return `${theme.theme} (${rate.toFixed(1)}% de aciertos)`;
            })
            .join(", ")
        : "Sin datos suficientes";

    // 🔒 Conversión segura para overallAccuracy
    const overallAccuracy = parseFloat(metrics.overallAccuracy) || 0;
    const totalQuestions = parseInt(metrics.totalQuestions) || 0;

    return `
Eres un tutor educativo inteligente. Analiza las siguientes métricas de aprendizaje del estudiante y proporciona recomendaciones personalizadas:

MÉTRICAS DE RETOS NORMALES:
- Precisión general: ${overallAccuracy.toFixed(1)}%
- Total de preguntas respondidas: ${totalQuestions}
- Temas con mayor dificultad: ${weakThemesInfo}

${intensiveAnalysis}

${recentSessionsInfo}

Proporciona una respuesta estructurada en JSON con este formato:
{
  "analysis": "Análisis general que combine datos de ambos modos",
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"],
  "recommendations": [
    {
      "type": "theme_review|study_technique|practice_strategy|game_mode_suggestion",
      "title": "Título de la recomendación",
      "description": "Descripción detallada",
      "priority": "high|medium|low"
    }
  ],
  "weekly_goals": ["Objetivo 1", "Objetivo 2"],
  "encouragement": "Mensaje motivacional personalizado"
}

Sé específico, constructivo y motivador. Incluye comparativas entre modos de práctica cuando sea relevante.`;
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
