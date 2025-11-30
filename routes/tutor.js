const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');

/**
 * @swagger
 * /tutor/advice:
 *   post:
 *     summary: Obtener recomendaciones del tutor IA
 *     tags: [Tutor]
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
 *               timeRange:
 *                 type: string
 *                 enum: [day, week, month]
 *                 default: week
 *                 description: Rango temporal para el análisis
 *                 example: week
 *     responses:
 *       200:
 *         description: Recomendaciones generadas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TutorAdvice'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
// Análisis y recomendaciones del tutor IA
router.post('/advice', tutorController.getTutorAdvice);

module.exports = router;
