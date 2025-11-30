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
 * Validación para iniciar sesión intensiva
 */
const validateStartSession = [
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

  body("gameMode")
    .notEmpty()
    .withMessage("gameMode es requerido")
    .isIn(["timed", "survival"])
    .withMessage("gameMode debe ser: timed o survival"),

  handleValidationErrors,
];

/**
 * Validación para guardar resultados de sesión
 */
const validateSaveResults = [
  body("sessionId")
    .notEmpty()
    .withMessage("sessionId es requerido")
    .isUUID()
    .withMessage("sessionId debe ser un UUID válido"),

  body("correctAnswers")
    .notEmpty()
    .withMessage("correctAnswers es requerido")
    .isArray()
    .withMessage("correctAnswers debe ser un array")
    .custom((value) => {
      if (!value.every((id) => Number.isInteger(id) && id > 0)) {
        throw new Error("Todos los IDs en correctAnswers deben ser enteros positivos");
      }
      return true;
    }),

  body("incorrectAnswers")
    .notEmpty()
    .withMessage("incorrectAnswers es requerido")
    .isArray()
    .withMessage("incorrectAnswers debe ser un array")
    .custom((value) => {
      if (!value.every((id) => Number.isInteger(id) && id > 0)) {
        throw new Error("Todos los IDs en incorrectAnswers deben ser enteros positivos");
      }
      return true;
    }),

  body("gameMode")
    .notEmpty()
    .withMessage("gameMode es requerido")
    .isIn(["timed", "survival"])
    .withMessage("gameMode debe ser: timed o survival"),

  body("timeUsed")
    .optional()
    .isInt({ min: 0 })
    .withMessage("timeUsed debe ser un número entero positivo o cero"),

  body("theme")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("theme debe tener entre 2 y 100 caracteres"),

  handleValidationErrors,
];

/**
 * Validación para obtener temas de usuario
 */
const validateGetUserThemes = [
  param("userId")
    .notEmpty()
    .withMessage("userId es requerido")
    .isInt({ min: 1 })
    .withMessage("userId debe ser un número entero positivo"),

  handleValidationErrors,
];

/**
 * Validación para continuar modo supervivencia
 */
const validateContinueSurvival = [
  body("sessionId")
    .notEmpty()
    .withMessage("sessionId es requerido")
    .isUUID()
    .withMessage("sessionId debe ser un UUID válido"),

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

  body("usedChallengeIds")
    .notEmpty()
    .withMessage("usedChallengeIds es requerido")
    .isArray()
    .withMessage("usedChallengeIds debe ser un array")
    .custom((value) => {
      if (!value.every((id) => Number.isInteger(id) && id > 0)) {
        throw new Error("Todos los IDs en usedChallengeIds deben ser enteros positivos");
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports = {
  validateStartSession,
  validateSaveResults,
  validateGetUserThemes,
  validateContinueSurvival,
};
