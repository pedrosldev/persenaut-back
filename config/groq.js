const Groq = require('groq-sdk');

// Instancia compartida de Groq para toda la aplicación
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Configuraciones de modelos predefinidos
const MODELS = {
  LLAMA_INSTANT: "llama-3.1-8b-instant", // Versión de pago - Rápido y económico
  GPT_OSS: "openai/gpt-oss-120b",
  LLAMA: "llama-3.3-70b-versatile",
  DEFAULT: "llama-3.1-8b-instant" // Cambiado a Llama 3.1 8B Instant
};

// Configuraciones de temperatura predefinidas
const TEMPERATURE = {
  PRECISE: 0.3,
  BALANCED: 0.7,
  CREATIVE: 0.7 // Reducido a 0.7 (mismo que BALANCED) para evitar alucinaciones
};

// Configuraciones adicionales para versión de pago (reducir repeticiones)
const ADVANCED_PARAMS = {
  frequency_penalty: 0.8,  // Reducido a 0.8 (1.5 era demasiado agresivo)
  presence_penalty: 0.6,   // Reducido a 0.6 (1.2 forzaba demasiado)
  top_p: 0.95,             // Nucleus sampling (mantener)
  seed: () => Math.floor(Math.random() * 1000000) // Seed aleatorio
};

module.exports = {
  groq,
  MODELS,
  TEMPERATURE,
  ADVANCED_PARAMS
};
