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

// Generación de retos
router.post('/generate', challengeController.generateChallenge);
router.post('/groq', challengeController.generateWithGroq);
router.post('/from-notes', challengeController.generateFromNotes);

// Guardar respuestas
router.post('/save-response', challengeController.saveResponse);
router.post('/save-intensive-response', challengeController.saveIntensiveResponse);

// Gestión de retos pendientes
router.post('/pending', pendingChallengesController.getPendingChallenges);
router.post('/start', pendingChallengesController.startChallenge);

module.exports = router;
