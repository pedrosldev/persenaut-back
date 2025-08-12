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


// const corsOptions = {
//   origin: function (origin, callback) {
   
//     const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');

    
//     if (!origin && process.env.NODE_ENV === 'development') {
//       return callback(null, true);
//     }

   
//     if (allowedOrigins.includes(origin)) {
      
//       callback(null, origin);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   methods: ['GET', 'POST', 'OPTIONS'],
//   allowedHeaders: ['Content-Type'],
//   optionsSuccessStatus: 204,
//   credentials: false
// };
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


app.post('/api/reto', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Se requiere un prompt' });
  }



  try {
    
    const response = await retryRequest({
      method: 'post',
      url: process.env.OLLAMA_API,
      data: {
        model: 'mistral',
        prompt: prompt,
        stream: false,
        num_threads: 1,
        num_ctx: 128,
        temperature: 0,
        options: {

          repeat_penalty: 1.1
        }
      },
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      },
      httpsAgent: keepAliveAgent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Respuesta Ollama:', response.data);


    if (response.data?.response) {
      return res.json({ reto: response.data.response }); 
    } else {
      throw new Error('Estructura de respuesta inesperada');
    }

  } catch (err) {
    console.error('Error al llamar a Ollama:', err.message);
    res.status(500).json({ error: 'Error al generar el reto', details: err.message });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
