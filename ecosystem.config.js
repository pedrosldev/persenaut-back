module.exports = {
    apps: [
        {
            name: 'persenaut-backend',           // Nombre del proceso PM2
            script: './app.js',               // Archivo de entrada de tu app
            instances: 1,                    // Número de instancias (1 para backend simple)
            autorestart: true,               // Reiniciar automáticamente si falla
            watch: false,                   // No vigilar archivos para reiniciar (evitar en producción)
            max_memory_restart: '200M',     // Reinicia si usa más de 200MB de RAM
            env: {
                NODE_ENV: 'production',
                OLLAMA_API: 'http://localhost:11434/api/generate',
                CORS_ALLOWED_ORIGINS: 'https://www.persenaut.piterxus.com',
                PORT: 3000
                // Otras variables que necesites
            }
        }
    ]
};
