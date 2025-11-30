const { body, param, validationResult } = require("express-validator");

/**
 * Middleware para validar errores de express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Errores de validación",
      details: errors.array(),
    });
  }
  next();
};

/**
 * Validación para generar un challenge
 */
const validateChallengeGeneration = [
  body("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  body("theme")
    .notEmpty()
    .withMessage("theme es requerido")
    .isString()
    .withMessage("theme debe ser un string")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("theme debe tener entre 2 y 100 caracteres"),

  body("level")
    .optional()
    .isIn(["básico", "intermedio", "avanzado"])
    .withMessage("level debe ser: básico, intermedio o avanzado"),

  body("deliveryTime")
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    .withMessage("deliveryTime debe tener formato HH:MM:SS"),

  body("frequency")
    .optional()
    .isIn(["daily", "weekly", "monthly"])
    .withMessage("frequency debe ser: daily, weekly o monthly"),

  handleValidationErrors,
];

/**
 * Validación para generar challenge con Groq
 */
const validateGroqGeneration = [
  body("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  body("theme")
    .notEmpty()
    .withMessage("theme es requerido")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("theme debe tener entre 2 y 100 caracteres"),

  body("level")
    .notEmpty()
    .withMessage("level es requerido")
    .isIn(["básico", "intermedio", "avanzado"])
    .withMessage("level debe ser: básico, intermedio o avanzado"),

  body("previousQuestions")
    .optional()
    .isArray()
    .withMessage("previousQuestions debe ser un array"),

  handleValidationErrors,
];

/**
 * Validación para generar challenge desde notas
 */
const validateFromNotesGeneration = [
  body("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  body("theme")
    .notEmpty()
    .withMessage("theme es requerido")
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("theme debe tener entre 2 y 100 caracteres"),

  body("level")
    .notEmpty()
    .withMessage("level es requerido")
    .isIn(["básico", "intermedio", "avanzado"])
    .withMessage("level debe ser: básico, intermedio o avanzado"),

  body("notes")
    .notEmpty()
    .withMessage("notes es requerido")
    .isString()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("notes debe tener entre 10 y 5000 caracteres"),

  handleValidationErrors,
];

/**
 * Validación para guardar respuesta de usuario
 */
const validateChallengeResponse = [
  body("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  body("challengeId")
    .notEmpty()
    .withMessage("challengeId es requerido")
    .isInt({ min: 1 })
    .withMessage("challengeId debe ser un número entero positivo"),

  body("userAnswer")
    .notEmpty()
    .withMessage("userAnswer es requerido")
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage("userAnswer debe tener entre 1 y 500 caracteres"),

  body("isCorrect")
    .notEmpty()
    .withMessage("isCorrect es requerido")
    .isBoolean()
    .withMessage("isCorrect debe ser un booleano"),

  handleValidationErrors,
];

/**
 * Validación para guardar respuesta intensiva
 */
const validateIntensiveResponse = [
  body("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  body("challengeId")
    .notEmpty()
    .withMessage("challengeId es requerido")
    .isInt({ min: 1 })
    .withMessage("challengeId debe ser un número entero positivo"),

  body("userAnswer")
    .notEmpty()
    .withMessage("userAnswer es requerido")
    .isString()
    .trim(),

  body("isCorrect")
    .notEmpty()
    .withMessage("isCorrect es requerido")
    .isBoolean()
    .withMessage("isCorrect debe ser un booleano"),

  body("sessionId")
    .notEmpty()
    .withMessage("sessionId es requerido")
    .isUUID()
    .withMessage("sessionId debe ser un UUID válido"),

  handleValidationErrors,
];

/**
 * Validación para iniciar un challenge
 */
const validateStartChallenge = [
  param("challengeId")
    .notEmpty()
    .withMessage("challengeId es requerido")
    .isInt({ min: 1 })
    .withMessage("challengeId debe ser un número entero positivo"),

  handleValidationErrors,
];

module.exports = {
  validateChallengeGeneration,
  validateGroqGeneration,
  validateFromNotesGeneration,
  validateChallengeResponse,
  validateIntensiveResponse,
  validateStartChallenge,
};
