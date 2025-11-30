/**
 * Middleware global para manejo centralizado de errores
 * Debe ser el último middleware en la cadena de app.js
 */
const errorHandler = (err, req, res, next) => {
  // Log del error completo para debugging
  console.error('❌ Error capturado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Errores de validación
  if (err.type === 'ValidationError' || err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validación',
      details: err.message,
      fields: err.fields || []
    });
  }

  // Errores de base de datos
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(500).json({
      error: 'Error en la base de datos',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
  }

  // Errores de autenticación
  if (err.type === 'AuthenticationError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Error de autenticación',
      details: err.message
    });
  }

  // Errores de autorización
  if (err.type === 'AuthorizationError') {
    return res.status(403).json({
      error: 'No tienes permisos para realizar esta acción',
      details: err.message
    });
  }

  // Errores de recurso no encontrado
  if (err.type === 'NotFoundError') {
    return res.status(404).json({
      error: 'Recurso no encontrado',
      details: err.message
    });
  }

  // Error de CORS
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'Acceso bloqueado por CORS',
      details: 'Este origen no está permitido'
    });
  }

  // Error genérico del servidor
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Ha ocurrido un error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
