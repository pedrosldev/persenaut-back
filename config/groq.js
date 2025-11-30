const Groq = require('groq-sdk');

// Instancia compartida de Groq para toda la aplicación
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuraciones de modelos predefinidos
const MODELS = {
  GPT_OSS: "openai/gpt-oss-120b",
  LLAMA: "llama-3.3-70b-versatile",
  DEFAULT: "openai/gpt-oss-120b"
};

// Configuraciones de temperatura predefinidas
const TEMPERATURE = {
  PRECISE: 0.3,
  BALANCED: 0.7,
  CREATIVE: 0.9
};

module.exports = {
  groq,
  MODELS,
  TEMPERATURE
};
