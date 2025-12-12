// services/promptService.js - VERSIÓN CORREGIDA
const generatePrompt = (theme, level, previousQuestions = []) => {
  const avoidRepetition =
    previousQuestions.length > 0
      ? `\n\nPREGUNTAS RECIENTES A EVITAR (NO REPITAS ESTAS NI HAGAS PARÁFRASIS):\n${previousQuestions
          .slice(-15) // Aumentado de 3 a 15 con versión de pago
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}\n`
      : "";

  return `ERES UN EXAMINADOR PROFESIONAL RIGUROSO. GENERA EXCLUSIVAMENTE PREGUNTAS TIPO TEST CON 4 OPCIONES (A-D) Y 1 RESPUESTA CORRECTA.

🚫 REGLA DE ORO: NUNCA INVENTES TÍTULOS, NOMBRES O FECHAS. USA SOLO LO QUE SABES AL 100%.

TEMA: ${theme}
NIVEL: ${level}
${avoidRepetition}

FORMATO OBLIGATORIO (COPIA ESTA ESTRUCTURA):

Pregunta: [Tu pregunta aquí]

A) [Opción A]
B) [Opción B]
C) [Opción C]
D) [Opción D]

Respuesta correcta: [Letra]

REGLAS ABSOLUTAS:
1. ¡NUNCA omitas las opciones A-D!
2. ¡Siempre incluye "Respuesta correcta:"!
3. ¡Solo 4 opciones exactamente!
4. ¡No añadas explicaciones adicionales!
5. ¡Mantén el formato línea por línea!
6. Genera SOLO UNA PREGUNTA.

🚫 ANTI-ALUCINACIÓN (CUMPLIMIENTO OBLIGATORIO):

PRINCIPIOS UNIVERSALES (APLICAN A CUALQUIER TEMA):

1. USA SOLO CONOCIMIENTO FUNDAMENTAL Y VERIFICABLE del tema solicitado
2. Si mencionas títulos/obras/nombres: USA SOLO LOS MÁS FAMOSOS Y DOCUMENTADOS
3. Si tienes MÍNIMA DUDA sobre un dato: CÁMBIALO por uno que conozcas con certeza
4. PRIORIZA conceptos generales sobre datos específicos que podrías confundir

EJEMPLOS POR TIPO DE PREGUNTA:

Para OBRAS (películas/libros/canciones):
✅ CORRECTO: Títulos ultra-conocidos y verificables (ej: "El Padrino", "Cien años de soledad")
❌ INCORRECTO: Títulos que podrías estar inventando o confundiendo

Para PERSONAS:
✅ CORRECTO: Figuras históricas o celebridades mundialmente famosas
❌ INCORRECTO: Nombres que "suenan bien" pero no recuerdas con seguridad

Para FECHAS/EVENTOS:
✅ CORRECTO: Eventos históricos mayores y documentados
❌ INCORRECTO: Fechas específicas de las que no estás 100% seguro

Para CONCEPTOS TÉCNICOS:
✅ CORRECTO: Comandos/términos fundamentales del campo
❌ INCORRECTO: Terminología oscura o que podrías estar mezclando

REGLA DE ORO: Si no puedes estar ABSOLUTAMENTE SEGURO de un dato, pregunta sobre el CONCEPTO GENERAL en lugar del detalle específico.

EJEMPLO CORRECTO (cualquier tema):
Pregunta sobre CONOCIMIENTO VERIFICABLE del tema
Opciones que incluyan CONCEPTOS/NOMBRES REALES Y CONOCIDOS
Evita datos ultra-específicos a menos que sean EXTREMADAMENTE FAMOSOS

EJEMPLO INCORRECTO:
❌ Mencionar títulos/nombres que "suenan bien" pero podrías estar inventando
❌ Fechas o datos específicos de los que tienes dudas
❌ Mezclar o confundir información de diferentes fuentes

ESTRATEGIA DE VARIEDAD:
- EXPLORA DIFERENTES ASPECTOS: Épocas, personas, obras, conceptos, curiosidades, evolución histórica
- Para temas culturales: Abarca desde los orígenes hasta la decadencia/evolución del movimiento
- Para temas técnicos: Alterna entre comandos básicos, intermedios, avanzados, casos de uso
- NO repitas el mismo enfoque en preguntas consecutivas
- Varía la dificultad y especificidad entre preguntas

SI TIENES DUDA AUNQUE SEA UN POCO: Pregunta sobre el CONCEPTO GENERAL en lugar del dato específico.`;
};

const formatQuestion = (rawText) => {
  if (!rawText || rawText.trim() === "") {
    return {
      questionText: "No se recibió respuesta del servidor",
      options: [],
      correctAnswer: null,
      rawText: rawText || "",
    };
  }

  try {
    let question = String(rawText)
      .replace(/\r\n/g, "\n")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    let correctAnswer = null;
    const answerMatch =
      question.match(/Respuesta correcta:\s*([ABCD])/i) ||
      question.match(/Correcta:\s*([ABCD])/i) ||
      question.match(/La respuesta correcta es\s*([ABCD])/i);

    if (answerMatch) {
      correctAnswer = answerMatch[1].toUpperCase();
      question = question.replace(/Respuesta correcta:\s*[ABCD].*/i, "").trim();
    }

    const questionParts = question.split(/\n\s*\n/);
    let questionText = questionParts[0] || "Pregunta no encontrada";
    let optionsText = questionParts.slice(1).join("\n") || "";

    questionText = questionText.replace(/^Pregunta:\s*/i, "").trim();

    const options = [];
    const optionRegex = /^([ABCD])[).]\s*(.+)$/gim;
    let optionMatch;

    while ((optionMatch = optionRegex.exec(optionsText)) !== null) {
      options.push({
        letter: optionMatch[1],
        text: optionMatch[2].trim(),
      });
    }

    if (options.length === 0) {
      const lines = optionsText
        .split("\n")
        .filter((line) => line.trim().length > 0);
      lines.forEach((line, index) => {
        if (index < 4) {
          const letter = String.fromCharCode(65 + index);
          options.push({
            letter: letter,
            text: line.trim().replace(/^[ABCD][).]\s*/, ""),
          });
        }
      });
    }

    return {
      questionText,
      options,
      correctAnswer,
      rawText,
    };
  } catch (error) {
    console.error("Error formateando pregunta:", error);
    return {
      questionText: rawText,
      options: [],
      correctAnswer: null,
      rawText: rawText,
    };
  }
};

const generatePromptFromNotes = (notes, theme, level) => {
  return `ERES UN EXPERTO EN CREAR EVALUACIONES EDUCATIVAS. ANALIZA LOS APUNTES PROPORCIONADOS Y GENERA UNA PREGUNTA DE TEST QUE EVALÚE LA COMPRENSIÓN DE CONCEPTOS CLAVE.

TEMA: ${theme}
NIVEL: ${level}

APUNTES DEL USUARIO:
"""
${notes}
"""

INSTRUCCIONES ESPECÍFICAS:
- Analiza los apuntes y genera EXCLUSIVAMENTE UNA PREGUNTA que evalúe un concepto importante presente en el texto
- La pregunta debe ser desafiante y requerir comprensión, no solo memorización
- Las opciones deben ser plausibles pero con solo UNA correcta
- La respuesta correcta debe basarse directamente en la información de los apuntes

FORMATO OBLIGATORIO (COPIA ESTA ESTRUCTURA):

Pregunta: [Pregunta basada en el análisis de los apuntes]

A) [Opción A]
B) [Opción B] 
C) [Opción C]
D) [Opción D]

Respuesta correcta: [Letra]

REGLAS ABSOLUTAS:
1. ¡Genera SOLO UNA PREGUNTA!
2. ¡NUNCA omitas las opciones A-D!
3. ¡Siempre incluye "Respuesta correcta:"!
4. ¡Las opciones incorrectas deben ser verosímiles pero definitivamente erróneas!
5. ¡No añadas explicaciones, análisis ni múltiples preguntas!
6. ¡La pregunta debe basarse directamente en el contenido de los apuntes!
7. ⚠️ CRÍTICO: USA ÚNICAMENTE INFORMACIÓN PRESENTE EN LOS APUNTES. NO INVENTES datos externos.`;
};

module.exports = { generatePrompt, generatePromptFromNotes, formatQuestion };


