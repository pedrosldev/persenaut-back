if (process.env.NODE_ENV === 'development') {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config({ path: '.env' });
}
console.log(`Entorno: ${process.env.NODE_ENV || 'development (default)'}`);
console.log(`API URL: ${process.env.OLLAMA_API || 'No configurada'}`);
const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors');
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
console.log(`API Key: ${process.env.GROQ_API_KEY ? 'Configurada' : 'No configurada'}`);
const authRoutes = require('./routes/auth');
const intensiveReviewRoutes = require('./routes/intensiveReview');
const cookieParser = require('cookie-parser');
const pool = require('./config/db');
const { generatePrompt, generatePromptFromNotes, formatQuestion } = require("./services/promptService");
const schedulerService = require("./services/schedulerService");
const metricsRoutes = require("./routes/metrics");


const corsOptions = {
  origin: function (origin, callback) {

    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');


    // if (!origin && process.env.NODE_ENV === 'development') {
    //   return callback(null, true);
    // }
      if (!origin) {
        return callback(null, true);
      }


    if (allowedOrigins.includes(origin)) {

      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  credentials: true
};

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors(corsOptions));


app.use('/api/auth', authRoutes);
app.use('/api/intensive-review', intensiveReviewRoutes);
app.use("/api/metrics", metricsRoutes);



const retryRequest = async (config, attempt = 0) => {
  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    if (attempt < 2) {
      console.log(`Reintentando (${attempt + 1}/2)...`);
      await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
      return retryRequest(config, attempt + 1);
    }
    throw error;
  }
};



// app.post("/api/reto", async (req, res) => {
//   const {
//     theme,
//     level,
//     previousQuestions = [],
//     userId,
//     preferences = {},
//   } = req.body;

//   if (!theme || !level) {
//     return res.status(400).json({ error: "Tema y nivel son requeridos" });
//   }

//   try {
//     // 1. Generar el prompt usando el servicio del backend
//     const prompt = generatePrompt(theme, level, previousQuestions);

//     // 2. Llamar a Ollama para generar el reto
//     const ollamaResponse = await retryRequest({
//       method: "post",
//       url: process.env.OLLAMA_API,
//       data: {
//         model: "mistral",
//         prompt: prompt,
//         stream: false,
//         options: { repeat_penalty: 1.1 },
//       },
//     });

//     if (!ollamaResponse.data?.response) {
//       throw new Error("Estructura de respuesta inesperada de Ollama");
//     }

//     const responseText = ollamaResponse.data.response;

//     // 3. Formatear la pregunta usando el servicio del backend
//     const formattedQuestion = formatQuestion(responseText);

//     // 4. Guardar en la base de datos (opcional, si quieres guardar inmediatamente)
//     if (userId) {
//       const connection = await pool.getConnection();
//       const [result] = await connection.execute(
//         `INSERT INTO questions (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, created_at) 
//                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//         [
//           theme,
//           level,
//           formattedQuestion.questionText,
//           JSON.stringify(formattedQuestion.options),
//           formattedQuestion.correctAnswer,
//           responseText,
//           userId,
//           preferences.deliveryTime || "09:00:00",
//           preferences.frequency || "daily",
//           true,
//           // preferences.isActive !== undefined ? preferences.isActive : true,
          
//         ]
//       );
//       connection.release();

//       // 5. Devolver respuesta completa
//       res.json({
//         success: true,
//         question: formattedQuestion,
//         rawResponse: responseText,
//         promptUsed: prompt,
//         savedQuestionId: result.insertId,
//         message: "Pregunta generada y guardada correctamente",
//       });
//     } else {
//       // Si no hay userId, solo devolver la pregunta generada
//       res.json({
//         success: true,
//         question: formattedQuestion,
//         rawResponse: responseText,
//         promptUsed: prompt,
//         message: "Pregunta generada correctamente",
//       });
//     }
//   } catch (error) {
//     console.error("Error en /api/reto:", error);
//     res.status(500).json({
//       error: "Error al generar la pregunta",
//       details: error.message,
//     });
//   }
// });

app.post("/api/reto", async (req, res) => {
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

    // 2. Llamar a GROQ en lugar de Ollama
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b", // o 'mixtral-8x7b-32768', 'gemma2-9b-it'
      temperature: 0.3,
      max_tokens: 500, // Limitar longitud para mayor velocidad
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error("Estructura de respuesta inesperada de Groq");
    }

    // 3. Formatear la pregunta usando el servicio del backend
    const formattedQuestion = formatQuestion(responseText);

    // 4. Guardar en la base de datos
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
      res.json({
        success: true,
        question: formattedQuestion,
        rawResponse: responseText,
        promptUsed: prompt,
        savedQuestionId: result.insertId,
        message: "Pregunta generada y guardada correctamente",
      });
    } else {
      // Si no hay userId, solo devolver la pregunta generada
      res.json({
        success: true,
        question: formattedQuestion,
        rawResponse: responseText,
        promptUsed: prompt,
        message: "Pregunta generada correctamente",
      });
    }
  } catch (error) {
    console.error("Error en /api/reto:", error);
    res.status(500).json({
      error: "Error al generar la pregunta",
      details: error.message,
    });
  }
});


app.post('/api/groq', async (req, res) => {
  // const { prompt } = req.body;
    const {
      theme,
      level,
      previousQuestions = [],
    
    } = req.body;
    const prompt = generatePrompt(theme, level, previousQuestions);
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "openai/gpt-oss-120b",
    });
    res.json({ response: completion.choices[0]?.message?.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* notificaciones */

// app.js - Nuevos endpoints
app.post("/api/pending-challenges", async (req, res) => {
  const { userId } = req.body;

  try {
    const connection = await pool.getConnection();
    
    const [challenges] = await connection.execute(
      `SELECT id, theme, level, question, options, correct_answer, 
              display_status, frequency, created_at
       FROM questions 
       WHERE user_id = ? 
       AND display_status = 'pending'
       AND is_active = false
       ORDER BY created_at DESC`,
      [userId]
    );

    connection.release();

    res.json({
      success: true,
      challenges: challenges.map(challenge => ({
        ...challenge,
        options: JSON.parse(challenge.options)
      }))
    });

  } catch (error) {
    console.error("Error fetching pending challenges:", error);
    res.status(500).json({
      error: "Error al obtener retos pendientes",
      details: error.message
    });
  }
});

app.post("/api/start-challenge", async (req, res) => {
  const { challengeId } = req.body;

  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      `UPDATE questions SET display_status = 'active' WHERE id = ?`,
      [challengeId]
    );

    connection.release();

    res.json({
      success: true,
      message: "Reto iniciado correctamente"
    });

  } catch (error) {
    console.error("Error starting challenge:", error);
    res.status(500).json({
      error: "Error al iniciar el reto",
      details: error.message
    });
  }
});
app.post("/api/generate-from-notes", async (req, res) => {
  const { userId, notes, theme, level, preferences = {} } = req.body;

  try {
    // 1. Generar el prompt especializado para apuntes
    const prompt = generatePromptFromNotes(notes, theme, level);

    // 2. Llamar a Groq
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error("No se recibió respuesta de Groq");
    }

    // 3. Formatear la pregunta
    const formattedQuestion = formatQuestion(responseText);

    // 4. Guardar en BD solo si hay userId (PATRÓN CONSISTENTE)
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

      res.json({
        success: true,
        question: formattedQuestion,
        rawResponse: responseText,
        promptUsed: prompt,
        savedQuestionId: result.insertId,
        message: "Reto generado desde apuntes y guardado correctamente",
      });
    } else {
      // Si no hay userId, solo devolver la pregunta generada
      res.json({
        success: true,
        question: formattedQuestion,
        rawResponse: responseText,
        promptUsed: prompt,
        message: "Reto generado desde apuntes correctamente",
      });
    }
  } catch (error) {
    console.error("Error en /api/generate-from-notes:", error);
    res.status(500).json({
      error: "Error al generar reto desde apuntes",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  schedulerService.start();
});
