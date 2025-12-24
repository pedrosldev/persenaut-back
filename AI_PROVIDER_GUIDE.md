# 🤖 Sistema Multi-Proveedor de IA - Guía Completa

## 📋 Índice

1. [Visión General](#visión-general)
2. [Proveedores Disponibles](#proveedores-disponibles)
3. [Configuración Inicial](#configuración-inicial)
4. [Guía para Usuarios](#guía-para-usuarios)
5. [Modo Demo](#modo-demo)
6. [API Reference](#api-reference)
7. [Frontend Integration](#frontend-integration)

---

## 🎯 Visión General

Persenaut ahora soporta **múltiples proveedores de IA**, permitiendo que cada usuario elija cómo y dónde ejecutar los modelos de lenguaje:

### Ventajas del Sistema

✅ **Cero costes para el desarrollador** - Los usuarios usan sus propias claves API  
✅ **Máxima flexibilidad** - Soporte para APIs cloud (Groq, OpenAI) y modelos locales (Ollama)  
✅ **Privacidad** - Opción de usar Ollama 100% offline  
✅ **Modo demo gratuito** - Para probar la plataforma sin configuración  
✅ **Escalable** - Fácil añadir nuevos proveedores en el futuro

---

## 🌐 Proveedores Disponibles

### 1. **Groq** (Recomendado)

- ⚡ **Ultra-rápido** - Respuestas en < 1 segundo
- 💰 **Económico** - Desde $0.05/1M tokens
- 🦙 **Modelos**: Llama 3.3 70B, Llama 3.1 8B
- 🔑 **Requiere**: API Key (gratis con límites)
- 📍 **Obtener clave**: https://console.groq.com/keys

### 2. **OpenAI**

- 🎯 **Modelos premium**: GPT-3.5, GPT-4
- 💰 **Coste**: Desde $0.50/1M tokens (GPT-3.5)
- 🔑 **Requiere**: API Key (de pago)
- 📍 **Obtener clave**: https://platform.openai.com/api-keys

### 3. **Ollama** (100% Local & Gratis)

- 🔒 **Privacidad total** - Sin enviar datos a internet
- 💸 **Gratis** - Sin límites de uso
- 🖥️ **Requiere**: Instalación local + Hardware (8GB+ RAM)
- 📍 **Descargar**: https://ollama.ai/download
- 🦙 **Modelos**: Llama 3.2, Mistral, Gemma, etc.

### 4. **Demo Mode**

- 🆓 **Gratis** - Sin configuración
- ⚠️ **Limitado** - Rate limiting estricto
- 🎯 **Uso**: Solo para probar la plataforma
- 📊 **Límites**: ~10 peticiones/hora

---

## ⚙️ Configuración Inicial

### Paso 1: Migración de Base de Datos

Ejecuta el script de migración para añadir las columnas necesarias:

```bash
mysql -u root -p persenaut < database/migrations/001_add_ai_provider_config.sql
```

### Paso 2: Variables de Entorno

En tu `.env` o `.env.local`:

```env
# Clave de encriptación para API keys de usuarios (IMPORTANTE: cambia esto)
ENCRYPTION_KEY=tu-clave-segura-de-32-caracteres-exactos

# Opcional: API keys del servidor para modo demo
GROQ_API_KEY=gsk_xxxxx  # Solo si quieres ofrecer modo demo
OPENAI_API_KEY=sk-xxxxx  # Opcional
```

### Paso 3: Instalar Dependencias

```bash
npm install openai
```

---

## 👤 Guía para Usuarios

### Opción A: Usar Groq (Recomendado)

**1. Obtener API Key gratis:**

- Ve a https://console.groq.com/keys
- Crea una cuenta (gratis)
- Genera una API key

**2. Configurar en Persenaut:**

```bash
POST /api/ai-config
{
  "provider": "groq",
  "apiKey": "gsk_tu_api_key_aqui",
  "model": "llama-3.3-70b-versatile"  // Opcional
}
```

**3. ¡Listo!** - Todas las peticiones de IA usarán tu cuenta de Groq

### Opción B: Usar Ollama (Local & Gratis)

**1. Instalar Ollama:**

- Descarga desde https://ollama.ai/download
- Instala en tu sistema (Windows/Mac/Linux)

**2. Descargar un modelo:**

```bash
ollama pull llama3.2
```

**3. Iniciar Ollama:**

```bash
ollama serve
```

**4. Configurar en Persenaut:**

```bash
POST /api/ai-config
{
  "provider": "ollama",
  "model": "llama3.2",
  "ollamaUrl": "http://localhost:11434"  // URL por defecto
}
```

**5. ¡Listo!** - Todo funciona offline y gratis

### Opción C: Usar OpenAI

**1. Obtener API Key (de pago):**

- Ve a https://platform.openai.com/api-keys
- Añade créditos a tu cuenta
- Genera una API key

**2. Configurar en Persenaut:**

```bash
POST /api/ai-config
{
  "provider": "openai",
  "apiKey": "sk-tu_api_key_aqui",
  "model": "gpt-3.5-turbo"  // o gpt-4
}
```

---

## 🎮 Modo Demo

Si no quieres configurar nada aún, puedes usar el **modo demo**:

- No requiere configuración
- Usa las claves del servidor (si están configuradas)
- Límite: ~10 peticiones/hora
- Ideal para probar la plataforma

El modo demo se activa automáticamente si el usuario no tiene configuración de IA.

---

## 📚 API Reference

### GET /api/ai-config

Obtiene la configuración actual del usuario.

**Response:**
```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "hasApiKey": true,
  "ollamaUrl": null
}
```

### GET /api/ai-config/providers

Lista todos los proveedores disponibles.

**Response:**
```json
[
  {
    "id": "groq",
    "name": "Groq",
    "requiresApiKey": true,
    "description": "Ultra-rápido, modelos Llama 3.x",
    "pricing": "Desde $0.05/1M tokens",
    "getApiKeyUrl": "https://console.groq.com/keys"
  },
  ...
]
```

### POST /api/ai-config

Configura o actualiza el proveedor de IA del usuario.

**Request:**
```json
{
  "provider": "groq",
  "apiKey": "gsk_xxxxx",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI configuration updated successfully"
}
```

### POST /api/ai-config/validate

Valida una configuración sin guardarla (útil para el frontend).

**Request:**
```json
{
  "provider": "groq",
  "apiKey": "gsk_xxxxx",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:**
```json
{
  "valid": true
}
```

o en caso de error:

```json
{
  "valid": false,
  "error": "Invalid API key"
}
```

### DELETE /api/ai-config

Elimina la configuración y vuelve al modo demo.

**Response:**
```json
{
  "success": true,
  "message": "AI configuration reset to demo mode"
}
```

---

## 🎨 Frontend Integration

### Componente de Configuración (React)

```jsx
import { useState, useEffect } from 'react';

export default function AIConfigPanel() {
  const [providers, setProviders] = useState([]);
  const [config, setConfig] = useState({
    provider: 'demo',
    apiKey: '',
    model: ''
  });

  useEffect(() => {
    // Cargar proveedores disponibles
    fetch('/api/ai-config/providers')
      .then(res => res.json())
      .then(setProviders);

    // Cargar configuración actual
    fetch('/api/ai-config', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setConfig);
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/ai-config', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });

    if (res.ok) {
      alert('✅ Configuración guardada');
    } else {
      const error = await res.json();
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleValidate = async () => {
    const res = await fetch('/api/ai-config/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await res.json();
    if (result.valid) {
      alert('✅ Configuración válida');
    } else {
      alert(`❌ ${result.error}`);
    }
  };

  return (
    <div className="ai-config-panel">
      <h2>🤖 Configuración de IA</h2>
      
      <select 
        value={config.provider} 
        onChange={e => setConfig({...config, provider: e.target.value})}
      >
        {providers.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} - {p.pricing}
          </option>
        ))}
      </select>

      {config.provider !== 'demo' && config.provider !== 'ollama' && (
        <input 
          type="password"
          placeholder="API Key"
          value={config.apiKey}
          onChange={e => setConfig({...config, apiKey: e.target.value})}
        />
      )}

      {config.provider === 'ollama' && (
        <input 
          type="text"
          placeholder="Ollama URL (http://localhost:11434)"
          value={config.ollamaUrl}
          onChange={e => setConfig({...config, ollamaUrl: e.target.value})}
        />
      )}

      <button onClick={handleValidate}>🔍 Validar</button>
      <button onClick={handleSave}>💾 Guardar</button>
    </div>
  );
}
```

---

## 🔒 Seguridad

### Encriptación de API Keys

Las API keys de los usuarios se almacenan **encriptadas** en la base de datos usando AES-256-CBC:

- ✅ Nunca se devuelven en las peticiones GET
- ✅ Solo se desencriptan al hacer peticiones a la IA
- ✅ Clave de encriptación en variable de entorno

### Best Practices

1. **ENCRYPTION_KEY** debe ser de 32 caracteres exactos
2. Nunca commitear claves reales en el código
3. Usar HTTPS en producción
4. Implementar rate limiting por usuario

---

## 🚀 Próximos Pasos

Para el frontend, implementa:

1. **Panel de configuración** en el perfil del usuario
2. **Selector de proveedor** con información de costes
3. **Validador en tiempo real** de API keys
4. **Indicador de uso** (opcional: tracking de tokens)
5. **Guías visuales** para obtener API keys

---

## 📊 Comparativa de Proveedores

| Proveedor | Velocidad | Coste/1M tokens | Privacidad | Instalación |
|-----------|-----------|-----------------|------------|-------------|
| Groq      | ⚡⚡⚡       | $0.05          | ⚠️ Cloud   | Ninguna     |
| OpenAI    | ⚡⚡        | $0.50          | ⚠️ Cloud   | Ninguna     |
| Ollama    | ⚡         | Gratis         | ✅ Total   | Media       |
| Demo      | ⚡⚡        | Gratis*        | ⚠️ Cloud   | Ninguna     |

*Demo: Limitado, solo para pruebas

---

## ❓ FAQ

### ¿Qué proveedor recomiendas?

- **Para comenzar**: Modo demo
- **Mejor relación calidad/precio**: Groq
- **Máxima privacidad**: Ollama
- **Mejor calidad**: OpenAI GPT-4

### ¿Puedo cambiar de proveedor después?

Sí, en cualquier momento. Solo actualiza tu configuración y el cambio es inmediato.

### ¿Qué pasa con mis datos existentes?

Nada cambia. Solo afecta a las futuras peticiones de IA.

### ¿Cómo funciona el modo demo?

Usa las API keys del servidor (si están configuradas) con rate limiting estricto para evitar abusos.

---

## 💡 Conclusión

Este sistema te permite **escalar sin asumir costes** de IA, mientras ofreces a los usuarios:

- Flexibilidad total
- Control sobre sus datos
- Opciones económicas (o gratis con Ollama)
- Facilidad de uso con el modo demo

¡Perfecto para un proyecto portfolio que puede crecer sin límites! 🚀
