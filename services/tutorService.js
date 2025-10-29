const groq = new (require("groq-sdk"))({ apiKey: process.env.GROQ_API_KEY });

class TutorService {
  async generateTutorAdvice(userId, timeRange = "week") {
    try {
      // Obtener métricas del usuario
      const userMetrics = await this.getUserMetrics(userId, timeRange);

      const prompt = this.buildTutorPrompt(userMetrics);

      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 800,
      });

      return this.parseTutorResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error("Error generating tutor advice:", error);
      return this.getFallbackAdvice();
    }
  }

  async getUserMetrics(userId, timeRange) {
    const connection = await require("../config/db").getConnection();

    // Obtener estadísticas de respuestas
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

    // Obtener temas con mayor dificultad
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

  buildTutorPrompt(metrics) {
    return `
Eres un tutor educativo inteligente. Analiza las siguientes métricas de aprendizaje del estudiante y proporciona:

1. Análisis de fortalezas y debilidades
2. Recomendaciones específicas de temas a reforzar
3. Estrategias de estudio personalizadas
4. Objetivos a corto plazo

MÉTRICAS DEL ESTUDIANTE:
- Precisión general: ${metrics.overallAccuracy.toFixed(1)}%
- Total de preguntas respondidas: ${metrics.totalQuestions}
- Temas con mayor dificultad: ${metrics.weakThemes
      .map(
        (theme) =>
          `${theme.theme} (${theme.success_rate.toFixed(1)}% de aciertos)`
      )
      .join(", ")}

Proporciona una respuesta estructurada en JSON con este formato:
{
  "analysis": "Análisis general del progreso",
  "strengths": ["Fortaleza 1", "Fortaleza 2"],
  "weaknesses": ["Debilidad 1", "Debilidad 2"],
  "recommendations": [
    {
      "type": "theme_review|study_technique|practice_strategy",
      "title": "Título de la recomendación",
      "description": "Descripción detallada",
      "priority": "high|medium|low"
    }
  ],
  "weekly_goals": ["Objetivo 1", "Objetivo 2"],
  "encouragement": "Mensaje motivacional personalizado"
}

Sé específico, constructivo y motivador.`;
  }

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
