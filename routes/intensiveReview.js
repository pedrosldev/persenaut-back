const express = require("express");
const router = express.Router();
const intensiveController = require("../controllers/intensiveController");
const {
  validateStartSession,
  validateSaveResults,
  validateGetUserThemes,
  validateContinueSurvival,
} = require("../middlewares/validators/intensiveValidator");

/**
 * @swagger
 * /intensive/start:
 *   post:
 *     summary: Iniciar sesión de modo intensivo
 *     tags: [Intensive Mode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - theme
 *               - gameMode
 *               - questionCount
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               theme:
 *                 type: string
 *                 description: Tema de la sesión
 *                 example: Física
 *               gameMode:
 *                 type: string
 *                 enum: [normal, survival, time_attack]
 *                 description: Modo de juego
 *                 example: survival
 *               questionCount:
 *                 type: integer
 *                 description: Número de preguntas
 *                 example: 10
 *     responses:
 *       200:
 *         description: Sesión iniciada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessionId:
 *                   type: integer
 *                   example: 123
 *                 questions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Challenge'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Rutas usando el controlador con validadores
router.post("/start", validateStartSession, intensiveController.startSession);

/**
 * @swagger
 * /intensive/save-results:
 *   post:
 *     summary: Guardar resultados de sesión intensiva
 *     tags: [Intensive Mode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - userId
 *               - correctAnswers
 *               - timeUsed
 *             properties:
 *               sessionId:
 *                 type: integer
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 example: 1
 *               correctAnswers:
 *                 type: integer
 *                 description: Número de respuestas correctas
 *                 example: 8
 *               timeUsed:
 *                 type: integer
 *                 description: Tiempo usado en segundos
 *                 example: 120
 *               responses:
 *                 type: array
 *                 description: Array de respuestas del usuario
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: integer
 *                     userAnswer:
 *                       type: string
 *                     isCorrect:
 *                       type: boolean
 *                     responseTime:
 *                       type: integer
 *     responses:
 *       200:
 *         description: Resultados guardados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resultados guardados
 *                 pointsEarned:
 *                   type: integer
 *                   example: 80
 *                 accuracy:
 *                   type: number
 *                   example: 80.5
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/save-results", validateSaveResults, intensiveController.saveResults);

/**
 * @swagger
 * /intensive/user-themes/{userId}:
 *   get:
 *     summary: Obtener temas del usuario para modo intensivo
 *     tags: [Intensive Mode]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de temas disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   theme:
 *                     type: string
 *                     example: Química
 *                   questionCount:
 *                     type: integer
 *                     description: Número de preguntas disponibles
 *                     example: 25
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/user-themes/:userId", validateGetUserThemes, intensiveController.getUserThemes);

/**
 * @swagger
 * /intensive/continue-survival:
 *   post:
 *     summary: Continuar modo supervivencia
 *     tags: [Intensive Mode]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - userId
 *             properties:
 *               sessionId:
 *                 type: integer
 *                 example: 123
 *               userId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Modo supervivencia continuado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Modo supervivencia continuado
 *                 nextQuestion:
 *                   $ref: '#/components/schemas/Challenge'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/continue-survival", validateContinueSurvival, intensiveController.continueSurvival);

module.exports = router;
