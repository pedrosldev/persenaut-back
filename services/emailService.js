// services/emailService.js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      // Configura según tu proveedor de email
      service: "gmail", // o 'outlook', 'yahoo', etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Para Gmail: App Password
      },
      tls: {
        rejectUnauthorized: false, // ⬅️ Añade esta opción
      },
    });
  }

  async sendChallengeNotification(
    userEmail,
    userName,
    challengeTheme,
    challengeLevel
  ) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: "🎯 ¡Tienes un nuevo reto disponible! - PerseNaut",
        html: this.getChallengeEmailTemplate(
          userName,
          challengeTheme,
          challengeLevel
        ),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado a ${userEmail}`);
      return result;
    } catch (error) {
      console.error("❌ Error enviando email:", error);
      throw error;
    }
  }

  getChallengeEmailTemplate(userName, theme, level) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                 color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .challenge-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; 
                         border-left: 4px solid #667eea; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; 
               text-decoration: none; border-radius: 5px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 PerseNaut</h1>
            <p>Tu plataforma de aprendizaje personalizado</p>
        </div>
        <div class="content">
            <h2>¡Hola ${userName}!</h2>
            <p>Tienes un nuevo reto disponible para seguir avanzando en tu aprendizaje.</p>
            
            <div class="challenge-card">
                <h3>📚 ${theme}</h3>
                <p><strong>Nivel:</strong> ${level}</p>
                <p><strong>Disponible hasta:</strong> Próxima entrega</p>
            </div>

            <p>Inicia sesión en la plataforma para resolver tu nuevo reto:</p>
            <a href="${
              process.env.FRONTEND_URL || "http://localhost:5173"
            }" class="btn">
                🚀 Ir a PerseNaut
            </a>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                ¿No esperabas este email? <a href="#">Configura tus preferencias de notificación</a>
            </p>
        </div>
    </div>
</body>
</html>
        `;
  }
}

module.exports = new EmailService();
