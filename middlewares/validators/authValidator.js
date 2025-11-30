const { body, validationResult } = require("express-validator");

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
 * Validación para registro de usuario
 */
const validateRegister = [
  body("email")
    .notEmpty()
    .withMessage("Email es requerido")
    .isEmail()
    .withMessage("Email debe ser válido")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email no puede exceder 255 caracteres"),

  body("password")
    .notEmpty()
    .withMessage("Password es requerido")
    .isString()
    .isLength({ min: 8, max: 100 })
    .withMessage("Password debe tener entre 8 y 100 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password debe contener al menos una mayúscula, una minúscula y un número"),

  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nombre debe tener entre 2 y 100 caracteres"),

  handleValidationErrors,
];

/**
 * Validación para login de usuario
 */
const validateLogin = [
  body("email")
    .notEmpty()
    .withMessage("Email es requerido")
    .isEmail()
    .withMessage("Email debe ser válido")
    .normalizeEmail()
    .trim(),

  body("password")
    .notEmpty()
    .withMessage("Password es requerido")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password debe tener al menos 8 caracteres"),

  handleValidationErrors,
];

/**
 * Validación para actualización de perfil
 */
const validateProfileUpdate = [
  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Nombre debe tener entre 2 y 100 caracteres"),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Email debe ser válido")
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Email no puede exceder 255 caracteres"),

  handleValidationErrors,
];

/**
 * Validación para cambio de contraseña
 */
const validatePasswordChange = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Contraseña actual es requerida")
    .isString(),

  body("newPassword")
    .notEmpty()
    .withMessage("Nueva contraseña es requerida")
    .isString()
    .isLength({ min: 8, max: 100 })
    .withMessage("Nueva contraseña debe tener entre 8 y 100 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Nueva contraseña debe contener al menos una mayúscula, una minúscula y un número"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirmación de contraseña es requerida")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Las contraseñas no coinciden");
      }
      return true;
    }),

  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
};
