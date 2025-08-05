require('dotenv').config();
const express = require('express');
const axios = require('axios');
const https = require('https');
const cors = require('cors');

const corsOptions = {
  origin: 'https://www.persenaut.piterxus.com',
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  // credentials: true
  optionsSuccessStatus: 200
};


const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// const keepAliveAgent = new https.Agent({
//   keepAlive: true,
//   maxSockets: 1, // ★ Limita a 1 conexión simultánea
//   timeout: 40000
// });
// const keepAliveAgent = new https.Agent({
//   keepAlive: true,
//   maxSockets: 10,     // ★ Permite hasta 10 conexiones simultáneas
//   maxFreeSockets: 5,  // Mantiene 5 conexiones libres para reutilizar
//   timeout: 30000      // 30s de inactividad para cerrar
// });
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 15,              // ★ Conexiones simultáneas (ajustado para tu VPS de 2 núcleos)
  maxFreeSockets: 10,          // Conexiones en espera para reutilizar
  keepAliveMsecs: 15000,       // Renovar conexiones cada 15s (Node.js 16+)
  timeout: 30000,              // Cerrar conexiones inactivas después de 30s
  scheduling: 'fifo'           // Política de cola (Node.js 16+)
});
// Middleware para manejar errores de CORS
const retryRequest = async (config, attempt = 0) => {
  try {
    const response = await axios(config);
    return response;
  } catch (error) {
    if (attempt < 2) { // Máximo 2 reintentos
      console.log(`Reintentando (${attempt + 1}/2)...`);
      await new Promise(res => setTimeout(res, 2000 * (attempt + 1)));
      return retryRequest(config, attempt + 1);
    }
    throw error; // Lanza el error después de los reintentos
  }
};

// app.use((req, res, next) => {
//   res.removeHeader('Access-Control-Allow-Origin');
//   res.removeHeader('Access-Control-Allow-Methods');
//   next();
// }); Funciona pero mala práctica
app.post('/api/reto', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Se requiere un prompt' });
  }

  // try {

  //   const response = await axios.post(process.env.OLLAMA_API, {
  //     model: 'phi3:mini',
  //     prompt: prompt,
  //     stream: false,

  //     num_threads: 1,
  //     num_ctx: 128,
  //     temperature: 0,

    
  //     options: {
  //       stop: ["\n"],    
  //       repeat_penalty: 1.1
  //     }
  //   }, {
  //     timeout: 30000,
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Connection': 'keep-alive'
  //     },
  //     httpsAgent: keepAliveAgent, // ★ Conexión persistente
  //     maxContentLength: Infinity,
  //     maxBodyLength: Infinity
  //   });

  try {
    // 3. Configuración de la petición con reintentos (¡MODIFICADO!)
    const response = await retryRequest({
      method: 'post',
      url: process.env.OLLAMA_API,
      data: {
        model: 'phi3:mini',
        prompt: prompt,
        stream: false,
        num_threads: 1,
        num_ctx: 128,
        temperature: 0,
        options: {
          stop: ["\n"],
          repeat_penalty: 1.1
        }
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive'
      },
      httpsAgent: keepAliveAgent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('Respuesta Ollama:', response.data);

    // if (response.data && response.data.response) {
    //   res.json({ reto: response.data.response });
    // } else {
    //   res.status(500).json({ error: 'respuesta inesperada de Ollama' });
    // }
    if (response.data?.response) {
      return res.json({ reto: response.data.response }); // ★ Única respuesta
    } else {
      throw new Error('Estructura de respuesta inesperada');
    }
   
  } catch (err) {
    console.error('Error al llamar a Ollama:', err.message);
    res.status(500).json({ error: 'Error al generar el reto', details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
