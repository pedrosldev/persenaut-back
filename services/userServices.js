const bcrypt = require("bcryptjs");
const pool = require("../config/db");

class UserService {
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
      const { name, username, email } = profileData;
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

      // Validar nueva contraseña
      if (newPassword.length < 6) {
        connection.release();
        throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
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

      // Eliminar usuario
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
