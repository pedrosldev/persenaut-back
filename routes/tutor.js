const express = require('express');
const router = express.Router();
const tutorController = require('../controllers/tutorController');

// Análisis y recomendaciones del tutor IA
router.post('/advice', tutorController.getTutorAdvice);

module.exports = router;
