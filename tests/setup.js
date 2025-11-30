// tests/setup.js
// Configuración global para tests

// Mock de variables de entorno
process.env.NODE_ENV = 'test';
process.env.GROQ_API_KEY = 'test-api-key';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret-key';

// Mock global de console para tests más limpios (opcional)
global.console = {
  ...console,
  // Silenciar logs en tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  // Mantener errores y warnings
  warn: console.warn,
  error: console.error,
};
