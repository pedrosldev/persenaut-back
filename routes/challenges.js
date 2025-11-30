const express = require("express");
const router = express.Router();
const challengeController = require("../controllers/challengeController");
const pendingChallengesController = require("../controllers/pendingChallengesController");
const {
  validateChallengeGeneration,
  validateGroqGeneration,
  validateFromNotesGeneration,
  validateChallengeResponse,
  validateIntensiveResponse,
  validateStartChallenge,
} = require("../middlewares/validators/challengeValidator");

/**
 * @swagger
 * /challenges/generate:
 *   post:
 *     summary: Generar un nuevo desafío/pregunta
 *     tags: [Challenges]
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
 *               - difficulty
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: ID del usuario
 *                 example: 1
 *               theme:
 *                 type: string
 *                 description: Tema del desafío
 *                 example: Matemáticas
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: Nivel de dificultad
 *                 example: medium
 *     responses:
 *       200:
 *         description: Desafío generado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Challenge'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Generación de retos
router.post('/generate', challengeController.generateChallenge);

/**
 * @swagger
 * /challenges/groq:
 *   post:
 *     summary: Generar pregunta usando Groq AI
 *     tags: [Challenges]
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
 *               - difficulty
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               theme:
 *                 type: string
 *                 example: Historia
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 example: hard
 *     responses:
 *       200:
 *         description: Pregunta generada con IA
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Challenge'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/groq', challengeController.generateWithGroq);

/**
 * @swagger
 * /challenges/from-notes:
 *   post:
 *     summary: Generar pregunta desde notas del usuario
 *     tags: [Challenges]
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
 *               - notes
 *               - difficulty
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               notes:
 *                 type: string
 *                 description: Contenido de las notas del usuario
 *                 example: La fotosíntesis es el proceso...
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 example: medium
 *     responses:
 *       200:
 *         description: Pregunta generada desde notas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Challenge'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/from-notes', challengeController.generateFromNotes);

/**
 * @swagger
 * /challenges/save-response:
 *   post:
 *     summary: Guardar respuesta a un desafío
 *     tags: [Challenges]
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
 *               - questionId
 *               - userAnswer
 *               - isCorrect
 *               - responseTime
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               questionId:
 *                 type: integer
 *                 example: 42
 *               userAnswer:
 *                 type: string
 *                 example: Opción B
 *               isCorrect:
 *                 type: boolean
 *                 example: true
 *               responseTime:
 *                 type: integer
 *                 description: Tiempo de respuesta en segundos
 *                 example: 15
 *     responses:
 *       200:
 *         description: Respuesta guardada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Respuesta guardada
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Guardar respuestas
router.post('/save-response', challengeController.saveResponse);
router.post('/save-intensive-response', challengeController.saveIntensiveResponse);

/**
 * @swagger
 * /challenges/pending:
 *   post:
 *     summary: Obtener desafíos pendientes del usuario
 *     tags: [Challenges]
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
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Lista de desafíos pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Challenge'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Gestión de retos pendientes
router.post('/pending', pendingChallengesController.getPendingChallenges);

/**
 * @swagger
 * /challenges/start:
 *   post:
 *     summary: Iniciar un desafío
 *     tags: [Challenges]
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
 *               - challengeId
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 1
 *               challengeId:
 *                 type: integer
 *                 example: 42
 *     responses:
 *       200:
 *         description: Desafío iniciado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Desafío iniciado
 *                 startTime:
 *                   type: string
 *                   format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/start', pendingChallengesController.startChallenge);

module.exports = router;
