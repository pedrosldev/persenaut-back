// services/promptService.js - VERSIÓN CORREGIDA
const generatePrompt = (theme, level, previousQuestions = []) => {
  const avoidRepetition =
    previousQuestions.length > 0
      ? `\n\nPREGUNTAS RECIENTES A EVITAR:\n${previousQuestions
          .slice(-3)
          .join("\n")}\n`
      : "";

  return `ERES UN EXAMINADOR PROFESIONAL. GENERA EXCLUSIVAMENTE PREGUNTAS TIPO TEST CON 4 OPCIONES (A-D) Y 1 RESPUESTA CORRECTA.

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
5. ¡Mantén el formato línea por línea!`;
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

module.exports = { generatePrompt, formatQuestion };
