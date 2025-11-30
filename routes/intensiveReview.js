const express = require("express");
const router = express.Router();
const intensiveController = require("../controllers/intensiveController");

// Rutas usando el controlador
router.post("/start", intensiveController.startSession);
router.post("/save-results", intensiveController.saveResults);
router.get("/user-themes/:userId", intensiveController.getUserThemes);
router.post("/continue-survival", intensiveController.continueSurvival);

module.exports = router;
