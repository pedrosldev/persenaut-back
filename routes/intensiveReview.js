const express = require("express");
const router = express.Router();
const intensiveController = require("../controllers/intensiveController");
const {
  validateStartSession,
  validateSaveResults,
  validateGetUserThemes,
  validateContinueSurvival,
} = require("../middlewares/validators/intensiveValidator");

// Rutas usando el controlador con validadores
router.post("/start", validateStartSession, intensiveController.startSession);
router.post("/save-results", validateSaveResults, intensiveController.saveResults);
router.get("/user-themes/:userId", validateGetUserThemes, intensiveController.getUserThemes);
router.post("/continue-survival", validateContinueSurvival, intensiveController.continueSurvival);

module.exports = router;
