# 📊 Fase 8: Database Migrations con Knex.js

## 🎯 Objetivo

Implementar **Database as Code** con Knex.js para:
- ✅ Versionar cambios en el schema de MySQL
- ✅ Sincronizar BD entre desarrollo, staging y producción
- ✅ Rollback automático si algo falla
- ✅ Historial completo de cambios en Git
- ✅ Seeders para datos de prueba

---

## 📚 ¿Qué son las Migraciones?

**Problema actual:**
```
Local:  ALTER TABLE users ADD COLUMN streak INT;
VPS:    (olvidas aplicarlo) → App crashea ❌
```

**Con migraciones:**
```
Local:  knex migrate:latest ✅
VPS:    knex migrate:latest ✅
        (Auto-aplica solo lo que falta)
```

Las migraciones son **archivos versionados** que describen cambios incrementales en tu BD.

---

## 🛠️ Instalación

### 1. Instalar Knex

```bash
npm install knex --save
npm install -g knex  # CLI global (opcional pero recomendado)
```

### 2. Verificar instalación

```bash
knex --version
# Debe mostrar: Knex CLI version: x.x.x
```

---

## ⚙️ Configuración

### 1. Crear `knexfile.js` en la raíz del proyecto

```javascript
// knexfile.js
require('dotenv').config({ path: '.env.local' });

module.exports = {
  // Configuración para desarrollo (Windows/Mac/Linux local)
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'persenaut',
      charset: 'utf8mb4'
    },
    migrations: {
      directory: './database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './database/seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  // Configuración para testing (opcional)
  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: 'persenaut_test', // Base de datos separada para tests
      charset: 'utf8mb4'
    },
    migrations: {
      directory: './database/migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  },

  // Configuración para producción (VPS)
  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4',
      // Opciones adicionales para producción
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: './database/migrations',
      tableName: 'knex_migrations'
    },
    pool: {
      min: 2,
      max: 20 // Más conexiones en producción
    }
  }
};
```

### 2. Actualizar `.gitignore`

```bash
# Ya deberías tener ignorado .env.local
# No ignores knexfile.js (va en Git)
```

### 3. Crear estructura de carpetas

```bash
mkdir -p database/migrations
mkdir -p database/seeds
```

---

## 📝 Crear tu primera migración

### 1. Generar migración baseline (estado actual)

```bash
knex migrate:make initial_schema --env development
```

Esto crea: `database/migrations/20251201120000_initial_schema.js`

### 2. Editar migración baseline

```javascript
// database/migrations/20251201120000_initial_schema.js

/**
 * Migración inicial: Schema actual de Persenaut
 * Representa el estado de la BD antes de adoptar migraciones
 */

exports.up = async function(knex) {
  // Tabla: users
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('email', 100).notNullable().unique();
    table.string('password', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_login');
    
    // Índices
    table.index('email');
    table.index('username');
  });

  // Tabla: questions
  await knex.schema.createTable('questions', (table) => {
    table.increments('id').primary();
    table.string('theme', 255).notNullable();
    table.string('level', 50).notNullable();
    table.text('question').notNullable();
    table.text('options', 'longtext').notNullable();
    table.char('correct_answer', 1).notNullable();
    table.text('raw_response');
    table.integer('user_id').unsigned();
    table.time('delivery_time').notNullable().defaultTo('09:00:00');
    table.enum('frequency', ['daily', 'weekly', 'monthly']).defaultTo('daily');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.enum('display_status', ['pending', 'active', 'completed']).defaultTo('pending');
    table.datetime('last_delivered');
    table.datetime('next_delivery');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices (Fase 7)
    table.index('theme');
    table.index('level');
    table.index(['theme', 'level']);
    table.index('user_id');
    table.index('is_active');
    table.index('display_status');
    table.index('next_delivery');
    table.index('delivery_time');
  });

  // Tabla: user_responses
  await knex.schema.createTable('user_responses', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('question_id').unsigned().notNullable();
    table.char('user_answer', 1).notNullable();
    table.boolean('is_correct').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('user_id');
    table.index('question_id');
    table.index(['user_id', 'created_at']);
    table.index('is_correct');
  });

  // Tabla: intensive_sessions
  await knex.schema.createTable('intensive_sessions', (table) => {
    table.string('session_id', 255).primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('theme', 100).notNullable();
    table.enum('game_mode', ['practice', 'time_attack', 'survival']).notNullable();
    table.integer('total_questions').notNullable();
    table.integer('correct_answers').notNullable();
    table.decimal('accuracy', 5, 2).notNullable();
    table.integer('total_points').notNullable();
    table.integer('time_seconds');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('user_id');
    table.index(['user_id', 'theme']);
    table.index(['user_id', 'game_mode']);
    table.index(['user_id', 'created_at']);
    table.index('created_at');
  });

  // Tabla: intensive_responses
  await knex.schema.createTable('intensive_responses', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255).notNullable();
    table.integer('question_id').unsigned().notNullable();
    table.char('user_answer', 1).notNullable();
    table.boolean('is_correct').notNullable();
    table.integer('time_seconds');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('session_id');
    table.index(['session_id', 'question_id']);
  });

  // Tabla: session_challenges
  await knex.schema.createTable('session_challenges', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255);
    table.integer('challenge_id');
    table.boolean('correct');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('session_id');
    table.index(['session_id', 'challenge_id']);
    table.index('challenge_id');
    table.index('correct');
  });

  // Tabla: session_scores
  await knex.schema.createTable('session_scores', (table) => {
    table.increments('id').primary();
    table.string('session_id', 255);
    table.integer('user_id').unsigned();
    table.integer('score').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('session_id');
    table.index('user_id');
  });

  // Tabla: user_metrics
  await knex.schema.createTable('user_metrics', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('total_questions_answered').defaultTo(0);
    table.integer('correct_answers').defaultTo(0);
    table.decimal('accuracy', 5, 2).defaultTo(0);
    table.integer('total_sessions').defaultTo(0);
    table.integer('total_points').defaultTo(0);
    table.integer('total_time_seconds').defaultTo(0);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Índice (no único por datos duplicados existentes)
    table.index('user_id');
  });

  // Tabla: user_achievements
  await knex.schema.createTable('user_achievements', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('achievement_id').unsigned().notNullable();
    table.timestamp('unlocked_at').defaultTo(knex.fn.now());
    
    // Índices
    table.index('user_id');
    table.index(['user_id', 'achievement_id']);
  });

  console.log('✅ Initial schema created successfully');
};

/**
 * Rollback: Eliminar todas las tablas
 * ⚠️ CUIDADO: Esto borra todos los datos
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_achievements');
  await knex.schema.dropTableIfExists('user_metrics');
  await knex.schema.dropTableIfExists('session_scores');
  await knex.schema.dropTableIfExists('session_challenges');
  await knex.schema.dropTableIfExists('intensive_responses');
  await knex.schema.dropTableIfExists('intensive_sessions');
  await knex.schema.dropTableIfExists('user_responses');
  await knex.schema.dropTableIfExists('questions');
  await knex.schema.dropTableIfExists('users');
  
  console.log('⚠️ All tables dropped');
};
```

### 3. **NO EJECUTAR** esta migración (ya tienes las tablas)

```bash
# ❌ NO HACER: knex migrate:latest
# Tu BD ya tiene estas tablas creadas
```

En su lugar, marcarla como aplicada:

```bash
knex migrate:up 20251201120000_initial_schema.js --env development
```

O simplemente insertar registro manual:

```sql
INSERT INTO knex_migrations (name, batch, migration_time) 
VALUES ('20251201120000_initial_schema.js', 1, NOW());
```

---

## 🚀 Ejemplo: Nueva migración (añadir columna)

### Escenario: Añadir sistema de rachas

```bash
knex migrate:make add_user_streaks --env development
```

Genera: `database/migrations/20251201130000_add_user_streaks.js`

```javascript
// database/migrations/20251201130000_add_user_streaks.js

/**
 * Añadir sistema de rachas diarias
 * Feature: Motivar usuarios a mantener constancia
 */

exports.up = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.integer('current_streak').unsigned().defaultTo(0)
      .comment('Días consecutivos de actividad');
    table.integer('longest_streak').unsigned().defaultTo(0)
      .comment('Récord de racha del usuario');
    table.date('last_activity_date')
      .comment('Última fecha de actividad para calcular racha');
    
    // Índice para queries de ranking
    table.index('current_streak', 'idx_users_current_streak');
  });

  console.log('✅ User streaks added');
};

exports.down = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.dropIndex('current_streak', 'idx_users_current_streak');
    table.dropColumn('current_streak');
    table.dropColumn('longest_streak');
    table.dropColumn('last_activity_date');
  });

  console.log('⚠️ User streaks removed');
};
```

### Aplicar migración

```bash
# Desarrollo
knex migrate:latest --env development

# Producción (VPS)
NODE_ENV=production knex migrate:latest --env production
```

### Rollback si algo falla

```bash
knex migrate:rollback --env development
```

---

## 📊 Comandos esenciales

### Ver estado de migraciones

```bash
knex migrate:status --env development
```

Salida:
```
Loaded 2 migration files
Ran 2 migrations
┌──────────────────────────────────────────┬───────┐
│ Name                                     │ Batch │
├──────────────────────────────────────────┼───────┤
│ 20251201120000_initial_schema.js         │ 1     │
│ 20251201130000_add_user_streaks.js       │ 2     │
└──────────────────────────────────────────┴───────┘
```

### Aplicar todas las pendientes

```bash
knex migrate:latest --env development
```

### Revertir última migración

```bash
knex migrate:rollback --env development
```

### Revertir todo (⚠️ peligroso)

```bash
knex migrate:rollback --all --env development
```

### Crear nueva migración

```bash
knex migrate:make nombre_descriptivo --env development
```

---

## 🌱 Seeds: Datos de prueba

### 1. Crear seed

```bash
knex seed:make 01_test_users --env development
```

### 2. Editar seed

```javascript
// database/seeds/01_test_users.js

exports.seed = async function(knex) {
  // Limpiar tabla (opcional)
  await knex('users').del();
  
  // Insertar datos de prueba
  await knex('users').insert([
    {
      id: 1,
      username: 'test_user',
      email: 'test@persenaut.com',
      password: '$2b$10$hashed_password_here',
      first_name: 'Test',
      last_name: 'User',
      current_streak: 5,
      longest_streak: 10
    },
    {
      id: 2,
      username: 'demo_user',
      email: 'demo@persenaut.com',
      password: '$2b$10$hashed_password_here',
      first_name: 'Demo',
      last_name: 'User',
      current_streak: 0,
      longest_streak: 3
    }
  ]);

  console.log('✅ Test users seeded');
};
```

### 3. Ejecutar seeds

```bash
knex seed:run --env development
```

---

## 🔄 Flujo de trabajo diario

### Desarrollo de nueva feature

```bash
# 1. Crear rama
git checkout -b feature/user-badges

# 2. Crear migración
knex migrate:make add_badges_table --env development

# 3. Editar migración (añadir código up/down)

# 4. Aplicar localmente
knex migrate:latest --env development

# 5. Probar que funciona
npm run dev

# 6. Commit
git add database/migrations/
git commit -m "feat(db): add badges system migration"

# 7. Push
git push origin feature/user-badges
```

### Aplicar en VPS (producción)

```bash
# En el VPS después de git pull
cd ~/persenaut_back/persenaut-back
git pull origin main

# Aplicar migraciones pendientes
NODE_ENV=production knex migrate:latest --env production

# Reiniciar app
pm2 restart persenaut-backend
```

---

## 🛡️ Buenas prácticas

### 1. **Nunca edites migraciones aplicadas**

```bash
❌ Editar 20251201_initial_schema.js (ya aplicada)
✅ Crear nueva: 20251202_fix_users_table.js
```

### 2. **Nombra migraciones descriptivamente**

```bash
✅ knex migrate:make add_user_streak_columns
✅ knex migrate:make create_badges_table
❌ knex migrate:make update_db
❌ knex migrate:make changes
```

### 3. **Siempre implementa `down()`**

```javascript
// ✅ Siempre reversible
exports.down = async function(knex) {
  await knex.schema.dropTable('badges');
};

// ❌ No dejes vacío
exports.down = async function(knex) {
  // TODO
};
```

### 4. **Testea rollback antes de commitear**

```bash
knex migrate:latest --env development
knex migrate:rollback --env development
knex migrate:latest --env development
# Si funciona sin errores, está lista
```

### 5. **Usa transacciones para operaciones múltiples**

```javascript
exports.up = async function(knex) {
  return knex.transaction(async (trx) => {
    await trx.schema.createTable('badges', ...);
    await trx.schema.createTable('user_badges', ...);
    // Si cualquiera falla, se revierten ambas
  });
};
```

### 6. **Documenta migraciones complejas**

```javascript
/**
 * Migración: Normalización de tabla questions
 * 
 * Problema: options almacenado como JSON string
 * Solución: Mover a tabla options separada
 * 
 * IMPORTANTE: Esta migración es irreversible sin backup manual
 * Ejecutar backup ANTES: mysqldump persenaut > backup_20251201.sql
 */
exports.up = async function(knex) {
  // ...
};
```

---

## 📋 Scripts NPM recomendados

Añade a `package.json`:

```json
{
  "scripts": {
    "migrate:latest": "knex migrate:latest --env development",
    "migrate:rollback": "knex migrate:rollback --env development",
    "migrate:status": "knex migrate:status --env development",
    "migrate:make": "knex migrate:make --env development",
    "seed:run": "knex seed:run --env development",
    "seed:make": "knex seed:make --env development",
    "db:reset": "knex migrate:rollback --all && knex migrate:latest && knex seed:run --env development"
  }
}
```

Uso:

```bash
npm run migrate:latest
npm run migrate:make add_feature_x
npm run db:reset  # ⚠️ Reset completo (solo dev)
```

---

## 🚨 Troubleshooting

### Error: "knex_migrations table doesn't exist"

```bash
# Crear tabla de control manualmente
knex migrate:latest --env development
```

O en MySQL:

```sql
CREATE TABLE knex_migrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  batch INT,
  migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Error: "Migration already ran"

```bash
# Ver estado
knex migrate:status --env development

# Marcar como no aplicada manualmente
DELETE FROM knex_migrations WHERE name = 'nombre_migracion.js';
```

### Error: "Cannot rollback - no migrations ran"

```bash
# Verificar que hay migraciones en la tabla
SELECT * FROM knex_migrations;

# Si está vacía pero las tablas existen, hacer baseline:
knex migrate:up 20251201120000_initial_schema.js
```

### Conflicto entre local y VPS

```bash
# Local
knex migrate:status  # Batch 1, 2, 3

# VPS
knex migrate:status  # Solo Batch 1

# Solución: Aplicar pendientes en VPS
NODE_ENV=production knex migrate:latest
```

---

## 🎯 Checklist de adopción

### Fase 1: Setup (1 hora)

- [ ] Instalar Knex: `npm install knex --save`
- [ ] Crear `knexfile.js` con config development/production
- [ ] Crear carpetas: `database/migrations/` y `database/seeds/`
- [ ] Añadir scripts NPM en `package.json`

### Fase 2: Baseline (30 minutos)

- [ ] Crear migración `initial_schema.js` con estado actual
- [ ] Marcarla como aplicada (sin ejecutar `up()`)
- [ ] Verificar: `knex migrate:status`

### Fase 3: Primera migración real (1 hora)

- [ ] Crear migración de prueba: `add_user_streaks`
- [ ] Implementar `up()` y `down()`
- [ ] Testear: `migrate:latest` → `migrate:rollback` → `migrate:latest`
- [ ] Aplicar en VPS

### Fase 4: Seeds (opcional, 30 minutos)

- [ ] Crear seed: `01_test_users.js`
- [ ] Ejecutar: `knex seed:run`
- [ ] Verificar datos en BD

### Fase 5: Documentación (15 minutos)

- [ ] Añadir sección en README.md
- [ ] Documentar workflow en equipo
- [ ] Compartir con otros devs

---

## 📚 Recursos adicionales

**Documentación oficial:**
- Knex.js: https://knexjs.org/
- Migrations: https://knexjs.org/guide/migrations.html
- Schema Builder: https://knexjs.org/guide/schema-builder.html

**Tutoriales:**
- Dev.to: https://dev.to/easybuoy/database-migrations-with-knex-5dba
- YouTube: "Knex.js Migrations Tutorial"

**Cheatsheet:**
```javascript
// Crear tabla
knex.schema.createTable('table_name', (table) => {
  table.increments('id');
  table.string('name', 100).notNullable();
  table.timestamps(true, true); // created_at, updated_at
});

// Modificar tabla
knex.schema.table('table_name', (table) => {
  table.integer('new_column');
  table.dropColumn('old_column');
  table.index('column_name');
});

// Eliminar tabla
knex.schema.dropTableIfExists('table_name');
```

---

## 🎉 Beneficios después de adoptar Knex

**Antes:**
```
❌ Cambios SQL manuales en cada entorno
❌ Desincronización entre local/staging/producción
❌ No hay historial de cambios en BD
❌ Rollback manual (si tienes suerte)
❌ Miedo de romper producción
```

**Después:**
```
✅ git pull → knex migrate:latest → Sincronizado
✅ Historial completo en Git
✅ Rollback automático con un comando
✅ Seeds para testing rápido
✅ Confianza en deployments
✅ Base de datos versionada como código
```

---

## 🚀 Próximos pasos

Una vez domines Knex, considera:

1. **CI/CD**: Auto-aplicar migraciones en deployment
2. **Backup automático**: Antes de cada migración en producción
3. **Blue-Green deployments**: Sin downtime
4. **Schema validation**: Tests que verifican integridad de BD

---

**🎯 Fase 8 = Database as Code = Control total de tu BD** ✅
