const Groq = require('groq-sdk');

// Instancia compartida de Groq para toda la aplicación
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuraciones de modelos predefinidos
const MODELS = {
  LLAMA_INSTANT: "llama-3.1-8b-instant", // Versión rápida - Para pruebas
  LLAMA_70B: "llama-3.3-70b-versatile", // Versión potente - Menos alucinaciones
  GPT_OSS: "openai/gpt-oss-120b",
  DEFAULT: "llama-3.3-70b-versatile" // Cambiado a 70B para mejor precisión
};

// Configuraciones de temperatura predefinidas
const TEMPERATURE = {
  PRECISE: 0.1,   // Para temas técnicos - MUY determinista (anti-alucinación)
  BALANCED: 0.3,  // Para temas generales - Equilibrio entre variedad y precisión
  CREATIVE: 0.4   // Para temas culturales - Más variedad para explorar diferentes aspectos
};

// Configuraciones adicionales para versión de pago (reducir repeticiones)
const ADVANCED_PARAMS = {
  frequency_penalty: 0.9,  // Balanceado para evitar repeticiones pero permitir variedad
  presence_penalty: 0.6,   // Fomenta nuevos temas sin ser demasiado agresivo
  top_p: 0.9,              // Nucleus sampling más estricto
  seed: () => Math.floor(Math.random() * 1000000) // Seed aleatorio
};

module.exports = {
  groq,
  MODELS,
  TEMPERATURE,
  ADVANCED_PARAMS
};
