const bcrypt = require("bcryptjs");
const pool = require("../config/db");

class UserService {
  // Validaciones
  _validateEmail(email) {
    if (!email || typeof email !== "string") {
      throw new Error("El email es requerido");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new Error("El formato del email no es válido");
    }

    if (email.length > 255) {
      throw new Error("El email es demasiado largo");
    }
  }

  _validateUsername(username) {
    if (!username || typeof username !== "string") {
      throw new Error("El nombre de usuario es requerido");
    }

    const trimmed = username.trim();

    if (trimmed.length < 3) {
      throw new Error("El nombre de usuario debe tener al menos 3 caracteres");
    }

    if (trimmed.length > 50) {
      throw new Error(
        "El nombre de usuario es demasiado largo (máximo 50 caracteres)"
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      throw new Error(
        "El nombre de usuario solo puede contener letras, números, guiones y guiones bajos"
      );
    }
  }

  _validateName(name) {
    if (!name || typeof name !== "string") {
      throw new Error("El nombre es requerido");
    }

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      throw new Error("El nombre debe tener al menos 2 caracteres");
    }

    if (trimmed.length > 100) {
      throw new Error("El nombre es demasiado largo (máximo 100 caracteres)");
    }
  }

  _validatePassword(password) {
    if (!password || typeof password !== "string") {
      throw new Error("La contraseña es requerida");
    }

    if (password.length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }

    if (password.length > 128) {
      throw new Error(
        "La contraseña es demasiado larga (máximo 128 caracteres)"
      );
    }
  }

  // Sanitizar entrada (prevenir inyecciones y XSS básico)
  _sanitizeString(str) {
    if (!str) return str;
    return str.trim();
  }

  // Obtener perfil del usuario
  async getUserProfile(userId) {
    try {
      const connection = await pool.getConnection();
      const [rows] = await connection.execute(
        "SELECT id, name, username, email, created_at FROM users WHERE id = ?",
        [userId]
      );
      connection.release();

      if (rows.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      return rows[0];
    } catch (error) {
      console.error("Error getting user profile:", error);
      throw error;
    }
  }

  // Actualizar perfil del usuario
  async updateUserProfile(userId, profileData) {
    try {
      let { name, username, email } = profileData;

      // Validar formatos
      this._validateName(name);
      this._validateUsername(username);
      this._validateEmail(email);

      // Sanitizar entrada
      name = this._sanitizeString(name);
      username = this._sanitizeString(username);
      email = this._sanitizeString(email).toLowerCase();

      const connection = await pool.getConnection();

      // Verificar si el email o username ya existen en otros usuarios
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?",
        [email, username, userId]
      );

      if (existingUsers.length > 0) {
        connection.release();
        throw new Error("El email o nombre de usuario ya están en uso");
      }

      await connection.execute(
        "UPDATE users SET name = ?, username = ?, email = ? WHERE id = ?",
        [name, username, email, userId]
      );

      connection.release();

      return { message: "Perfil actualizado correctamente" };
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  }

  // Cambiar contraseña (cuando el usuario SÍ conoce la actual)
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Validar que las contraseñas están presentes
      if (!currentPassword) {
        throw new Error("La contraseña actual es requerida");
      }

      // Validar nueva contraseña
      this._validatePassword(newPassword);

      const connection = await pool.getConnection();

      // Obtener la contraseña actual
      const [rows] = await connection.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        [userId]
      );

      if (rows.length === 0) {
        connection.release();
        throw new Error("Usuario no encontrado");
      }

      // Verificar contraseña actual
      const validPassword = await bcrypt.compare(
        currentPassword,
        rows[0].password_hash
      );
      if (!validPassword) {
        connection.release();
        throw new Error("La contraseña actual es incorrecta");
      }

      // Verificar que la nueva contraseña no sea igual a la actual
      const samePassword = await bcrypt.compare(
        newPassword,
        rows[0].password_hash
      );
      if (samePassword) {
        connection.release();
        throw new Error("La nueva contraseña debe ser diferente a la actual");
      }

      // Hashear nueva contraseña
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await connection.execute(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newPasswordHash, userId]
      );

      connection.release();

      return { message: "Contraseña actualizada correctamente" };
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  // Eliminar cuenta
  async deleteAccount(userId, password) {
    try {
      if (!password) {
        throw new Error("La contraseña es requerida para eliminar la cuenta");
      }

      const connection = await pool.getConnection();

      // Verificar contraseña
      const [rows] = await connection.execute(
        "SELECT password_hash FROM users WHERE id = ?",
        [userId]
      );

      if (rows.length === 0) {
        connection.release();
        throw new Error("Usuario no encontrado");
      }

      const validPassword = await bcrypt.compare(
        password,
        rows[0].password_hash
      );
      if (!validPassword) {
        connection.release();
        throw new Error("Contraseña incorrecta");
      }

      // Eliminar usuario (considera usar soft delete en producción)
      await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

      connection.release();

      return { message: "Cuenta eliminada correctamente" };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw error;
    }
  }
}

module.exports = new UserService();
