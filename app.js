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
const cookieParser = require('cookie-parser');
const pool = require('./config/db');
const { generatePrompt, formatQuestion } = require("./services/promptService");


const corsOptions = {
  origin: function (origin, callback) {

    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');


    if (!origin && process.env.NODE_ENV === 'development') {
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


const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 15,
  maxFreeSockets: 10,
  keepAliveMsecs: 15000,
  timeout: 30000,
  scheduling: 'fifo'
});

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


// app.post('/api/reto', async (req, res) => {
//   const { prompt } = req.body;

//   if (!prompt) {
//     return res.status(400).json({ error: 'Se requiere un prompt' });
//   }



//   try {

//     const response = await retryRequest({
//       method: 'post',
//       url: process.env.OLLAMA_API,
//       data: {
//         model: 'mistral',
//         prompt: prompt,
//         stream: false,
//         num_threads: 1,
//         num_ctx: 128,
//         temperature: 0,
//         options: {

//           repeat_penalty: 1.1
//         }
//       },
//       // timeout: 60000,
//       headers: {
//         'Content-Type': 'application/json',
//         'Connection': 'keep-alive'
//       },
//       httpsAgent: keepAliveAgent,
//       maxContentLength: Infinity,
//       maxBodyLength: Infinity
//     });

//     console.log('Respuesta Ollama:', response.data);


//     if (response.data?.response) {
//       return res.json({ reto: response.data.response });
//     } else {
//       throw new Error('Estructura de respuesta inesperada');
//     }

//   } catch (err) {
//     console.error('Error al llamar a Ollama:', err.message);
//     res.status(500).json({ error: 'Error al generar el reto', details: err.message });
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

    // 2. Llamar a Ollama para generar el reto
    const ollamaResponse = await retryRequest({
      method: "post",
      url: process.env.OLLAMA_API,
      data: {
        model: "mistral",
        prompt: prompt,
        stream: false,
        options: { repeat_penalty: 1.1 },
      },
    });

    if (!ollamaResponse.data?.response) {
      throw new Error("Estructura de respuesta inesperada de Ollama");
    }

    const responseText = ollamaResponse.data.response;

    // 3. Formatear la pregunta usando el servicio del backend
    const formattedQuestion = formatQuestion(responseText);

    // 4. Guardar en la base de datos (opcional, si quieres guardar inmediatamente)
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
          preferences.isActive !== undefined ? preferences.isActive : true,
          
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
    console.error("Error en /api/generate-question:", error);
    res.status(500).json({
      error: "Error al generar la pregunta",
      details: error.message,
    });
  }
});


app.post('/api/groq', async (req, res) => {
  const { prompt } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    res.json({ response: completion.choices[0]?.message?.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// app.js - Endpoint para guardar preguntas
app.post('/api/save-question', async (req, res) => {
  const { theme, level, question, options, correctAnswer, rawResponse, userId, deliveryTime = '09:00:00', frequency = 'daily', isActive = true   } = req.body;

  console.log('Datos recibidos para guardar:', {
    theme,
    level,
    question: question ? question.substring(0, 50) + '...' : null,
    optionsCount: options ? options.length : 0,
    correctAnswer,
    userId,
    deliveryTime,
    frequency,
    isActive
  });

  // Validación de campos obligatorios
  if (!theme || !level || !question || !options || !correctAnswer || !userId) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios',
      details: {
        theme: !theme ? 'Falta tema' : 'OK',
        level: !level ? 'Falta nivel' : 'OK',
        question: !question ? 'Falta pregunta' : 'OK',
        options: !options ? 'Falta opciones' : 'OK',
        correctAnswer: !correctAnswer ? 'Falta respuesta correcta' : 'OK'
      }
    });
  }

  try {
    // Obtener conexión del pool
    const connection = await pool.getConnection();

    // Insertar en la base de datos
    const [result] = await connection.execute(
      `INSERT INTO questions (theme, level, question, options, correct_answer, raw_response, user_id, delivery_time, frequency, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        theme,
        level,
        question,
        JSON.stringify(options),
        correctAnswer,
        rawResponse || '',
        userId,
        deliveryTime,
        frequency,
        isActive
      ]
    );

    // Liberar la conexión
    connection.release();

    console.log('✅ Pregunta guardada con ID:', result.insertId);

    res.json({
      success: true,
      message: 'Pregunta guardada correctamente',
      id: result.insertId
    });

  } catch (error) {
    console.error('❌ Error al guardar en la base de datos:', error);

    // Verificar si es error de conexión
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({
        error: 'Error de conexión a la base de datos',
        details: 'No se puede conectar al servidor MySQL'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      code: error.code
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
