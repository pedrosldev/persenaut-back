const express = require("express");
const userService = require("../services/userServices");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Middleware para verificar autenticación
const authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "No autenticado" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "Token inválido" });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    res.status(401).json({ error: "Error de autenticación" });
  }
};

// Obtener perfil del usuario
router.get("/profile", authenticate, async (req, res) => {
  try {
    const profile = await userService.getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar perfil
router.put("/profile", authenticate, async (req, res) => {
  try {
    const result = await userService.updateUserProfile(req.user.id, req.body);
    res.json(result);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(400).json({ error: error.message });
  }
});

// Cambiar contraseña (cuando el usuario conoce la actual)
router.put("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Ambas contraseñas son requeridas" });
    }

    const result = await userService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(400).json({ error: error.message });
  }
});

// Eliminar cuenta
router.delete("/account", authenticate, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res
        .status(400)
        .json({ error: "La contraseña es requerida para confirmar" });
    }

    const result = await userService.deleteAccount(req.user.id, password);

    // Limpiar cookie al eliminar cuenta
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.json(result);
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
