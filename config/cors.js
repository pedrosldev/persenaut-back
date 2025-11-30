// Configuración centralizada de CORS
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS.split(',');

    // Permitir requests sin origin (herramientas como Postman)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  credentials: true
};

module.exports = corsOptions;
