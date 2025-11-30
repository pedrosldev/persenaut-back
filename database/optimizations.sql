-- ========================================
-- FASE 7: OPTIMIZACIÓN DE BASE DE DATOS
-- ========================================
-- Índices para mejorar performance de queries frecuentes
-- Aplicar en la base de datos MySQL existente

-- ========================================
-- TABLA: users
-- ========================================

-- Índice para búsquedas por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índice para búsquedas por username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ========================================
-- TABLA: questions
-- ========================================

-- Índice para queries por tema
CREATE INDEX IF NOT EXISTS idx_questions_theme ON questions(theme);

-- Índice para queries por dificultad
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

-- Índice compuesto para queries por tema y dificultad
CREATE INDEX IF NOT EXISTS idx_questions_theme_difficulty ON questions(theme, difficulty);

-- ========================================
-- TABLA: user_responses
-- ========================================

-- Índice compuesto para queries por usuario y timestamp
CREATE INDEX IF NOT EXISTS idx_responses_user_time ON user_responses(user_id, created_at);

-- Índice para queries de métricas por usuario
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON user_responses(user_id);

-- Índice para queries de análisis por pregunta
CREATE INDEX IF NOT EXISTS idx_responses_question_id ON user_responses(question_id);

-- Índice para queries de respuestas correctas
CREATE INDEX IF NOT EXISTS idx_responses_is_correct ON user_responses(is_correct);

-- ========================================
-- TABLA: intensive_sessions
-- ========================================

-- Índice compuesto para queries por usuario y tema
CREATE INDEX IF NOT EXISTS idx_sessions_user_theme ON intensive_sessions(user_id, theme);

-- Índice compuesto para queries por usuario y modo de juego
CREATE INDEX IF NOT EXISTS idx_sessions_user_gamemode ON intensive_sessions(user_id, game_mode);

-- Índice para queries por usuario y fecha (timeline)
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON intensive_sessions(user_id, created_at);

-- Índice para queries de sesiones recientes
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON intensive_sessions(created_at);

-- ========================================
-- TABLA: intensive_responses
-- ========================================

-- Índice para queries por sesión
CREATE INDEX IF NOT EXISTS idx_intensive_responses_session ON intensive_responses(session_id);

-- Índice compuesto para queries por sesión y pregunta
CREATE INDEX IF NOT EXISTS idx_intensive_responses_session_question ON intensive_responses(session_id, question_id);

-- ========================================
-- TABLA: user_metrics
-- ========================================

-- Índice único para queries rápidas por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_metrics_user_id ON user_metrics(user_id);

-- ========================================
-- TABLA: user_achievements
-- ========================================

-- Índice compuesto para queries por usuario y logro
CREATE INDEX IF NOT EXISTS idx_achievements_user_achievement ON user_achievements(user_id, achievement_id);

-- Índice para queries por usuario
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON user_achievements(user_id);

-- ========================================
-- TABLA: session_challenges
-- ========================================

-- Índice compuesto para queries por sesión y pregunta
CREATE INDEX IF NOT EXISTS idx_session_challenges_session_question ON session_challenges(session_id, question_id);

-- Índice para queries por sesión
CREATE INDEX IF NOT EXISTS idx_session_challenges_session ON session_challenges(session_id);

-- ========================================
-- TABLA: session_scores
-- ========================================

-- Índice para queries por sesión
CREATE INDEX IF NOT EXISTS idx_session_scores_session ON session_scores(session_id);

-- Índice para queries por usuario
CREATE INDEX IF NOT EXISTS idx_session_scores_user ON session_scores(user_id);

-- ========================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- ========================================

-- Consulta para verificar índices de una tabla específica
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   COLUMN_NAME,
--   SEQ_IN_INDEX,
--   INDEX_TYPE
-- FROM information_schema.STATISTICS
-- WHERE TABLE_SCHEMA = 'tu_base_de_datos'
--   AND TABLE_NAME = 'nombre_tabla'
-- ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;

-- ========================================
-- NOTAS DE PERFORMANCE
-- ========================================

/*
ÍNDICES APLICADOS Y SU IMPACTO ESPERADO:

1. users (email, username):
   - Mejora: 10-50x en queries de login/registro
   - Uso: Autenticación, verificación de unicidad

2. questions (theme, difficulty):
   - Mejora: 5-20x en generación de desafíos
   - Uso: Selección de preguntas para modo intensivo

3. user_responses (user_id, created_at, is_correct):
   - Mejora: 10-100x en queries de métricas
   - Uso: Dashboard de usuario, análisis temporal

4. intensive_sessions (user_id, theme, game_mode, created_at):
   - Mejora: 5-30x en queries de sesiones
   - Uso: Historial, estadísticas por modo de juego

5. intensive_responses (session_id, question_id):
   - Mejora: 3-10x en queries de respuestas
   - Uso: Detalle de sesión, análisis de respuestas

6. session_challenges (session_id, question_id):
   - Mejora: 5-15x en queries de desafíos por sesión
   - Uso: Obtener preguntas de una sesión específica

7. session_scores (session_id, user_id):
   - Mejora: 10-30x en queries de puntuaciones
   - Uso: Rankings, historial de scores por usuario

RECOMENDACIONES:

1. ANALIZAR QUERIES LENTOS:
   - Usar EXPLAIN para identificar queries sin índices
   - Monitorear slow query log de MySQL

2. MANTENIMIENTO DE ÍNDICES:
   - ANALYZE TABLE periódicamente para actualizar estadísticas
   - OPTIMIZE TABLE si hay muchas inserciones/eliminaciones

3. MONITOREAR TAMAÑO DE ÍNDICES:
   - Los índices ocupan espacio en disco
   - Balance entre velocidad de lectura y espacio/escritura

4. CONSIDERAR ÍNDICES ADICIONALES:
   - Si nuevas queries se vuelven frecuentes
   - Basado en análisis de performance real

5. EVITAR SOBRE-INDEXACIÓN:
   - Cada índice ralentiza INSERT/UPDATE/DELETE
   - Solo crear índices para queries realmente frecuentes
*/

-- ========================================
-- COMANDOS DE MANTENIMIENTO
-- ========================================

-- Actualizar estadísticas de tablas
-- ANALYZE TABLE users, questions, user_responses, intensive_sessions, intensive_responses, session_challenges, session_scores;

-- Optimizar tablas (desfragmentar)
-- OPTIMIZE TABLE users, questions, user_responses, intensive_sessions, intensive_responses, session_challenges, session_scores;

-- Ver tamaño de índices
-- SELECT 
--   TABLE_NAME,
--   INDEX_NAME,
--   ROUND(((INDEX_LENGTH) / 1024 / 1024), 2) AS `Size (MB)`
-- FROM information_schema.TABLES
-- WHERE TABLE_SCHEMA = 'tu_base_de_datos'
-- ORDER BY INDEX_LENGTH DESC;
