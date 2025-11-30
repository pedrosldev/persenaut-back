const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Configuración de Swagger/OpenAPI
 */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Persenaut API',
      version: '1.0.0',
      description: 'API RESTful para plataforma educativa de desafíos y aprendizaje personalizado con IA',
      contact: {
        name: 'Persenaut Development Team',
        email: 'support@persenaut.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.persenaut.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido al iniciar sesión'
        }
      },
      schemas: {
        // Schema para Usuario
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID único del usuario'
            },
            username: {
              type: 'string',
              description: 'Nombre de usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de registro'
            }
          }
        },

        // Schema para Challenge/Pregunta
        Challenge: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de la pregunta'
            },
            theme: {
              type: 'string',
              description: 'Tema de la pregunta'
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
              description: 'Nivel de dificultad'
            },
            question_text: {
              type: 'string',
              description: 'Texto de la pregunta'
            },
            options: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Opciones de respuesta'
            },
            correct_answer: {
              type: 'string',
              description: 'Respuesta correcta (solo visible en el backend)'
            }
          }
        },

        // Schema para Sesión Intensiva
        IntensiveSession: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID de la sesión'
            },
            user_id: {
              type: 'integer',
              description: 'ID del usuario'
            },
            theme: {
              type: 'string',
              description: 'Tema de la sesión'
            },
            game_mode: {
              type: 'string',
              enum: ['normal', 'survival', 'time_attack'],
              description: 'Modo de juego'
            },
            total_questions: {
              type: 'integer',
              description: 'Total de preguntas generadas'
            },
            correct_answers: {
              type: 'integer',
              description: 'Respuestas correctas'
            },
            time_used: {
              type: 'integer',
              description: 'Tiempo usado en segundos'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            }
          }
        },

        // Schema para Métricas de Usuario
        UserMetrics: {
          type: 'object',
          properties: {
            total_points: {
              type: 'integer',
              description: 'Puntos totales acumulados'
            },
            total_sessions: {
              type: 'integer',
              description: 'Total de sesiones completadas'
            },
            total_correct_answers: {
              type: 'integer',
              description: 'Total de respuestas correctas'
            },
            average_accuracy: {
              type: 'number',
              format: 'float',
              description: 'Precisión promedio (%)'
            },
            total_time_spent: {
              type: 'integer',
              description: 'Tiempo total en segundos'
            }
          }
        },

        // Schema para Advice del Tutor
        TutorAdvice: {
          type: 'object',
          properties: {
            analysis: {
              type: 'string',
              description: 'Análisis general del progreso'
            },
            strengths: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Fortalezas identificadas'
            },
            weaknesses: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Áreas de mejora'
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['theme_review', 'study_technique', 'practice_strategy']
                  },
                  title: {
                    type: 'string'
                  },
                  description: {
                    type: 'string'
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                  }
                }
              },
              description: 'Recomendaciones personalizadas'
            },
            weekly_goals: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Objetivos semanales sugeridos'
            },
            encouragement: {
              type: 'string',
              description: 'Mensaje motivacional'
            }
          }
        },

        // Schema para Errores
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'Campo con error'
                  },
                  message: {
                    type: 'string',
                    description: 'Descripción del error'
                  }
                }
              },
              description: 'Detalles de validación (opcional)'
            }
          }
        },

        // Schema para respuesta de éxito genérica
        SuccessResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de éxito'
            },
            data: {
              type: 'object',
              description: 'Datos de respuesta (variable)'
            }
          }
        }
      },

      // Respuestas reutilizables
      responses: {
        UnauthorizedError: {
          description: 'Token de autenticación faltante o inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Token no proporcionado o inválido'
              }
            }
          }
        },
        ValidationError: {
          description: 'Error de validación de entrada',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Errores de validación',
                details: [
                  {
                    field: 'email',
                    message: 'El email debe ser válido'
                  }
                ]
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Recurso no encontrado'
              }
            }
          }
        },
        ServerError: {
          description: 'Error interno del servidor',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Error interno del servidor'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Endpoints de autenticación y gestión de usuarios'
      },
      {
        name: 'Challenges',
        description: 'Endpoints para generar y gestionar desafíos/preguntas'
      },
      {
        name: 'Intensive Mode',
        description: 'Endpoints para el modo intensivo de práctica'
      },
      {
        name: 'Tutor',
        description: 'Endpoints para recomendaciones del tutor IA'
      },
      {
        name: 'Metrics',
        description: 'Endpoints para métricas y estadísticas de usuario'
      },
      {
        name: 'Profile',
        description: 'Endpoints para gestión de perfil de usuario'
      },
      {
        name: 'Themes',
        description: 'Endpoints para gestión de temas educativos'
      }
    ]
  },
  // Rutas donde buscar las anotaciones de Swagger
  apis: [
    './routes/*.js',
    './controllers/*.js',
    './services/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
