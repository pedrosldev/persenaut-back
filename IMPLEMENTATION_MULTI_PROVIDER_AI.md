# 🔧 Implementación Sistema Multi-Proveedor de IA

## 📋 Resumen Ejecutivo

Este documento describe la **implementación técnica** del sistema multi-proveedor de IA que permite:

- **Eliminar costes de IA para el servidor** (los usuarios usan sus propias claves)
- **Soporte para múltiples proveedores**: Groq, OpenAI, Ollama (local)
- **Modo demo opcional** con rate limiting
- **BYOK (Bring Your Own Key)** - cada usuario configura su proveedor
- **Arquitectura extensible** para añadir nuevos proveedores fácilmente

---

## 🏗️ Arquitectura del Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│            (Panel de configuración de IA)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ POST /api/ai-config
                         │ GET  /api/ai-config/providers
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes Layer                          │
│                  routes/aiConfig.js                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AIProviderService                           │
│         (Interfaz unificada de proveedores)                  │
│                                                              │
│  • getAdapter(userConfig)                                   │
│  • generateCompletion(params)                               │
│  • validateConfig(config)                                   │
└─────────────┬───────────────┬────────────────┬──────────────┘
              │               │                │
              ▼               ▼                ▼
     ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
     │GroqAdapter   │ │OpenAIAdapter│ │OllamaAdapter │
     │              │ │             │ │              │
     │ chat()       │ │ chat()      │ │ chat()       │
     │ listModels() │ │ listModels()│ │ listModels() │
     └──────┬───────┘ └──────┬──────┘ └──────┬───────┘
            │                │               │
            ▼                ▼               ▼
     ┌──────────────────────────────────────────────┐
     │         External AI Services                 │
     │  Groq API │ OpenAI API │ Ollama Local       │
     └──────────────────────────────────────────────┘
```

### Base de Datos

```
users table
├── ai_provider (VARCHAR)          → 'groq', 'openai', 'ollama', 'demo'
├── ai_api_key_encrypted (TEXT)    → API key encriptada (AES-256-CBC)
├── ai_model (VARCHAR)              → Modelo preferido del usuario
├── ai_ollama_url (VARCHAR)         → URL personalizada de Ollama
└── ai_config_updated_at (TIMESTAMP)
```

---

## 📁 Estructura de Archivos

### Archivos Nuevos a Crear

```
persenaut-back/
├── services/
│   └── aiProviderService.js          ← Servicio principal (interfaz unificada)
│
├── adapters/                         ← NUEVA CARPETA
│   ├── GroqAdapter.js                ← Adaptador para Groq
│   ├── OpenAIAdapter.js              ← Adaptador para OpenAI
│   └── OllamaAdapter.js              ← Adaptador para Ollama local
│
├── routes/
│   └── aiConfig.js                   ← Endpoints de configuración de IA
│
├── database/
│   └── migrations/
│       └── 001_add_ai_provider_config.sql  ← Migración de BD
│
└── AI_PROVIDER_GUIDE.md              ← Guía para usuarios finales
```

### Archivos a Modificar

```
persenaut-back/
├── repositories/
│   └── userRepository.js             ← Añadir métodos de config de IA
│
├── services/
│   ├── tutorService.js               ← Usar AIProviderService
│   └── intensiveService.js           ← Usar AIProviderService
│
├── app.js                            ← Registrar ruta /api/ai-config
│
└── package.json                      ← Añadir dependencia 'openai'
```

---

## 🔨 Pasos de Implementación

### PASO 1: Crear el Servicio Principal

**Archivo:** `services/aiProviderService.js`

**Propósito:** Interfaz unificada que:
- Gestiona múltiples adaptadores
- Selecciona el adaptador correcto según configuración del usuario
- Proporciona métodos comunes (`generateCompletion`, `validateConfig`)

**Código clave:**

```javascript
class AIProviderService {
  getAdapter(userConfig = {}) {
    const { provider, apiKey, ollamaUrl } = userConfig;
    
    // Si el usuario provee su API key, crear adaptador personalizado
    if (apiKey && provider !== 'ollama') {
      return new GroqAdapter(apiKey); // o OpenAIAdapter
    }
    
    // Si es Ollama (local)
    if (provider === 'ollama') {
      return new OllamaAdapter(ollamaUrl);
    }
    
    // Modo demo (usa claves del servidor)
    return this.adapters.get('demo');
  }

  async generateCompletion({ prompt, userConfig, temperature, maxTokens }) {
    const adapter = this.getAdapter(userConfig);
    return await adapter.chat({
      messages: [{ role: 'user', content: prompt }],
      model: userConfig.model || DEFAULT_MODELS[userConfig.provider],
      temperature: TEMPERATURE_PRESETS[temperature],
      maxTokens
    });
  }
}
```

---

### PASO 2: Crear los Adaptadores

Cada adaptador implementa la **misma interfaz**:

```javascript
class Adapter {
  async chat({ messages, model, temperature, maxTokens }) {
    // Implementación específica del proveedor
  }
  
  async listModels() {
    // Devuelve modelos disponibles
  }
}
```

#### **GroqAdapter.js**

```javascript
const Groq = require('groq-sdk');

class GroqAdapter {
  constructor(apiKey) {
    this.client = new Groq({ apiKey });
  }

  async chat({ messages, model, temperature, maxTokens }) {
    const completion = await this.client.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens
    });
    return completion.choices[0]?.message?.content?.trim();
  }
}
```

#### **OpenAIAdapter.js**

```javascript
const OpenAI = require('openai');

class OpenAIAdapter {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async chat({ messages, model, temperature, maxTokens }) {
    const completion = await this.client.chat.completions.create({
      messages, model, temperature, max_tokens: maxTokens
    });
    return completion.choices[0]?.message?.content?.trim();
  }
}
```

#### **OllamaAdapter.js**

```javascript
const axios = require('axios');

class OllamaAdapter {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async chat({ messages, model, temperature, maxTokens }) {
    const response = await axios.post(`${this.baseUrl}/api/chat`, {
      model,
      messages,
      stream: false,
      options: { temperature, num_predict: maxTokens }
    });
    return response.data?.message?.content?.trim();
  }
}
```

---

### PASO 3: Migración de Base de Datos

**Archivo:** `database/migrations/001_add_ai_provider_config.sql`

```sql
-- Añadir columnas para configuración de IA
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_provider VARCHAR(20) DEFAULT 'demo';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_api_key_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_ollama_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_config_updated_at TIMESTAMP;

-- Índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_users_ai_provider ON users(ai_provider);

-- Valores por defecto para usuarios existentes
UPDATE users 
SET ai_provider = 'demo', ai_config_updated_at = CURRENT_TIMESTAMP
WHERE ai_provider IS NULL;
```

**Ejecutar:**

```bash
mysql -u root -p persenaut < database/migrations/001_add_ai_provider_config.sql
```

---

### PASO 4: Actualizar UserRepository

**Archivo:** `repositories/userRepository.js`

**Añadir métodos:**

```javascript
class UserRepository {
  // Obtener configuración de IA del usuario
  async getAIConfig(userId) {
    const [rows] = await connection.execute(
      'SELECT ai_provider, ai_api_key_encrypted, ai_model, ai_ollama_url FROM users WHERE id = ?',
      [userId]
    );
    
    return {
      provider: rows[0].ai_provider || 'demo',
      apiKey: rows[0].ai_api_key_encrypted ? this._decryptApiKey(rows[0].ai_api_key_encrypted) : null,
      model: rows[0].ai_model,
      ollamaUrl: rows[0].ai_ollama_url
    };
  }

  // Actualizar configuración de IA
  async updateAIConfig(userId, config) {
    const encryptedKey = config.apiKey ? this._encryptApiKey(config.apiKey) : null;
    
    await connection.execute(
      `UPDATE users 
       SET ai_provider = ?, ai_api_key_encrypted = ?, ai_model = ?, ai_ollama_url = ?
       WHERE id = ?`,
      [config.provider, encryptedKey, config.model, config.ollamaUrl, userId]
    );
  }

  // Encriptación AES-256-CBC
  _encryptApiKey(apiKey) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8').slice(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(apiKey, 'utf8', 'hex') + cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  _decryptApiKey(encrypted) {
    const crypto = require('crypto');
    const [ivHex, encryptedData] = encrypted.split(':');
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8').slice(0, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }
}
```

---

### PASO 5: Refactorizar Servicios Existentes

#### **tutorService.js**

**Antes:**

```javascript
const { groq, MODELS, TEMPERATURE } = require("../config/groq");

const completion = await groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: MODELS.DEFAULT,
  temperature: TEMPERATURE.BALANCED,
  max_tokens: 800
});

const rawText = completion.choices[0]?.message?.content;
```

**Después:**

```javascript
const { AIProviderService } = require('./aiProviderService');
const userRepository = require('../repositories/userRepository');

// Obtener configuración del usuario
const userAIConfig = await userRepository.getAIConfig(userId);

// Usar el proveedor configurado
const rawText = await AIProviderService.generateCompletion({
  prompt,
  userConfig: userAIConfig,
  temperature: 'balanced',
  maxTokens: 800
});
```

#### **intensiveService.js**

Mismo cambio que tutorService.js.

---

### PASO 6: Crear Endpoints de Configuración

**Archivo:** `routes/aiConfig.js`

```javascript
const router = express.Router();
const { AIProviderService } = require('../services/aiProviderService');
const userRepository = require('../repositories/userRepository');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/ai-config - Obtener configuración actual
router.get('/', authMiddleware, async (req, res) => {
  const config = await userRepository.getAIConfig(req.user.id);
  res.json({
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey  // No devolver la key real
  });
});

// GET /api/ai-config/providers - Listar proveedores disponibles
router.get('/providers', async (req, res) => {
  res.json(AIProviderService.getAvailableProviders());
});

// POST /api/ai-config - Guardar configuración
router.post('/', authMiddleware, async (req, res) => {
  const { provider, apiKey, model, ollamaUrl } = req.body;
  
  // Validar antes de guardar
  const validation = await AIProviderService.validateConfig({
    provider, apiKey, model, ollamaUrl
  });
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  await userRepository.updateAIConfig(req.user.id, {
    provider, apiKey, model, ollamaUrl
  });
  
  res.json({ success: true });
});

// POST /api/ai-config/validate - Validar sin guardar
router.post('/validate', async (req, res) => {
  const validation = await AIProviderService.validateConfig(req.body);
  res.json(validation);
});

// DELETE /api/ai-config - Volver a modo demo
router.delete('/', authMiddleware, async (req, res) => {
  await userRepository.deleteAIConfig(req.user.id);
  res.json({ success: true });
});
```

---

### PASO 7: Registrar Ruta en app.js

**Archivo:** `app.js`

```javascript
// Importar nueva ruta
const aiConfigRoutes = require('./routes/aiConfig');

// Registrar
app.use('/api/ai-config', apiLimiter, aiConfigRoutes);
```

---

### PASO 8: Configurar Variables de Entorno

**Archivo:** `.env` o `.env.local`

```env
# Clave de encriptación (OBLIGATORIO - 32 caracteres)
ENCRYPTION_KEY=tu-clave-super-segura-de-32ch

# Opcional: API keys del servidor para modo demo
GROQ_API_KEY=gsk_xxxxx     # Si quieres ofrecer modo demo
OPENAI_API_KEY=sk_xxxxx    # Opcional
```

---

### PASO 9: Instalar Dependencias

```bash
npm install openai
```

---

## 🔒 Seguridad

### Encriptación de API Keys

- **Algoritmo**: AES-256-CBC
- **Clave**: Variable de entorno `ENCRYPTION_KEY` (32 chars)
- **IV**: Generado aleatoriamente por cada encriptación
- **Almacenamiento**: `iv:encrypted_data` en formato hexadecimal

### Validación de Configuración

Antes de guardar, se valida haciendo una petición de prueba:

```javascript
async validateConfig(config) {
  try {
    const adapter = this.getAdapter(config);
    await adapter.chat({
      messages: [{ role: 'user', content: 'Hi' }],
      model: config.model,
      temperature: 0.1,
      maxTokens: 10
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### Best Practices

1. ✅ **Nunca devolver API keys** en GET requests
2. ✅ **Usar HTTPS** en producción
3. ✅ **Rate limiting** por usuario
4. ✅ **Logging de intentos fallidos**
5. ✅ **ENCRYPTION_KEY en .gitignore**

---

## 🧪 Testing

### Test de Adaptadores

```javascript
describe('GroqAdapter', () => {
  it('should generate completion', async () => {
    const adapter = new GroqAdapter(process.env.GROQ_API_KEY);
    const response = await adapter.chat({
      messages: [{ role: 'user', content: 'Say hi' }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      maxTokens: 10
    });
    expect(response).toBeTruthy();
  });
});
```

### Test de Endpoints

```javascript
describe('POST /api/ai-config', () => {
  it('should save valid config', async () => {
    const res = await request(app)
      .post('/api/ai-config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        provider: 'groq',
        apiKey: 'gsk_test',
        model: 'llama-3.3-70b-versatile'
      });
    
    expect(res.status).toBe(200);
  });
});
```

---

## 📊 Flujo de Datos

### Ejemplo: Usuario genera una pregunta

```
1. Usuario hace click en "Generar pregunta"
   ↓
2. Frontend → POST /api/challenges/generate
   ↓
3. challengeController obtiene userId del JWT
   ↓
4. intensiveService.generateAutoChallenges(userId, theme)
   ↓
5. userRepository.getAIConfig(userId)
   → Devuelve { provider: 'groq', apiKey: 'gsk_xxx', model: 'llama-3.3-70b' }
   ↓
6. AIProviderService.generateCompletion({ userConfig, prompt })
   ↓
7. AIProviderService.getAdapter(userConfig)
   → Crea nuevo GroqAdapter con la API key del usuario
   ↓
8. GroqAdapter.chat({ messages, model, temperature })
   → Llamada a Groq API usando la key del usuario
   ↓
9. Respuesta → intensiveService → challengeController → Frontend
```

**Resultado**: El coste lo asume el **usuario**, no el servidor.

---

## 🎯 Ventajas de esta Arquitectura

### 1. Patrón Adapter (Design Pattern)

- ✅ **Separación de responsabilidades**: Cada adaptador solo conoce su proveedor
- ✅ **Extensible**: Añadir nuevo proveedor = crear nuevo adaptador
- ✅ **Testeable**: Mockear adaptadores es trivial
- ✅ **Mantenible**: Cambios en un proveedor no afectan a otros

### 2. BYOK (Bring Your Own Key)

- ✅ **Cero costes para el servidor**: Usuarios pagan su propio uso
- ✅ **Escalable**: Sin límites de crecimiento
- ✅ **Transparente**: Usuario sabe exactamente qué gasta

### 3. Flexibilidad

- ✅ **Múltiples opciones**: Cloud (Groq/OpenAI) o Local (Ollama)
- ✅ **Cambio dinámico**: Usuario puede cambiar proveedor cuando quiera
- ✅ **Modo demo**: Probar antes de configurar

---

## 🚀 Próximos Pasos (Futuras Mejoras)

### Corto Plazo

- [ ] **Rate limiting por usuario** (no solo global)
- [ ] **Tracking de uso** (tokens consumidos por usuario)
- [ ] **Alertas de coste** (avisar cuando superen X tokens)

### Medio Plazo

- [ ] **Más proveedores**: Anthropic (Claude), Mistral AI
- [ ] **Caché de respuestas**: Reducir costes con Redis
- [ ] **Fallback automático**: Si un proveedor falla, intentar con otro

### Largo Plazo

- [ ] **Sistema de créditos**: Ofrecer X tokens gratis al mes
- [ ] **Marketplace de modelos**: Usuarios comparten sus configs
- [ ] **Analytics de uso**: Dashboard con estadísticas

---

## ❓ FAQ Técnico

### ¿Por qué no usar directamente Groq en todos lados?

Porque vincularías el código a un solo proveedor. Con adaptadores:
- Cambiar proveedor = cambiar 1 línea
- Añadir proveedor = crear nuevo adaptador
- Testear = mockear adaptador

### ¿Por qué encriptar las API keys?

Aunque están en una BD privada, es **buena práctica**:
- Protección ante SQL injection
- Protección ante dumps de BD accidentales
- Cumplimiento de normativas (GDPR, etc.)

### ¿Cómo añadir un nuevo proveedor?

1. Crear `adapters/NuevoProveedorAdapter.js`
2. Implementar método `chat()`
3. Añadir a `PROVIDERS` en `aiProviderService.js`
4. Actualizar `getAdapter()` para incluirlo
5. ¡Listo!

### ¿Qué pasa si el usuario no configura nada?

Usa **modo demo** con las claves del servidor (si existen) y rate limiting estricto.

---

## 📝 Checklist de Implementación

Antes de mergear a producción:

- [ ] ✅ Todos los archivos creados
- [ ] ✅ Migración de BD ejecutada
- [ ] ✅ Variables de entorno configuradas
- [ ] ✅ Dependencias instaladas (`npm install openai`)
- [ ] ✅ Tests escritos y pasando
- [ ] ✅ Documentación actualizada
- [ ] ✅ Frontend integrado (panel de config)
- [ ] ✅ Rate limiting configurado
- [ ] ✅ Logs de auditoría
- [ ] ✅ Validación de inputs
- [ ] ✅ Manejo de errores robusto

---

## 🎓 Conclusión

Esta implementación transforma Persenaut en una plataforma **sostenible** que:

1. **No genera costes** de IA para el servidor
2. **Ofrece flexibilidad** a los usuarios
3. **Es escalable** sin límites
4. **Es mantenible** gracias a patrones de diseño
5. **Es segura** con encriptación de claves

Perfecto para un **proyecto portfolio profesional** que demuestra:
- Arquitectura de software sólida
- Seguridad y buenas prácticas
- Escalabilidad y extensibilidad
- Pensamiento orientado al negocio (reducir costes)

---

**¿Listo para implementar?** Sigue los pasos en orden y tendrás el sistema funcionando. 🚀
