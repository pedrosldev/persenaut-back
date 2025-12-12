// services/questionValidator.js
/**
 * Servicio para validar preguntas generadas y detectar posibles alucinaciones
 */

class QuestionValidator {
  /**
   * Valida que una pregunta formateada sea coherente y no contenga alucinaciones evidentes
   * @param {Object} formattedQuestion - Pregunta formateada por formatQuestion()
   * @param {string} theme - Tema de la pregunta
   * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
   */
  validate(formattedQuestion, theme = '') {
    const errors = [];
    const warnings = [];

    // 1. Validar estructura básica
    if (!formattedQuestion.questionText || formattedQuestion.questionText.length < 10) {
      errors.push('La pregunta es demasiado corta o está vacía');
    }

    if (!formattedQuestion.options || formattedQuestion.options.length !== 4) {
      errors.push(`Se esperaban 4 opciones, se recibieron ${formattedQuestion.options?.length || 0}`);
    }

    if (!formattedQuestion.correctAnswer) {
      errors.push('No se especificó respuesta correcta');
    }

    // 2. Validar que la respuesta correcta exista en las opciones
    if (formattedQuestion.correctAnswer && formattedQuestion.options) {
      const correctOption = formattedQuestion.options.find(
        opt => opt.letter === formattedQuestion.correctAnswer
      );
      if (!correctOption) {
        errors.push(`La respuesta correcta "${formattedQuestion.correctAnswer}" no está entre las opciones`);
      }
    }

    // 3. Validar que no haya opciones duplicadas
    if (formattedQuestion.options && formattedQuestion.options.length === 4) {
      const optionTexts = formattedQuestion.options.map(opt => opt.text.toLowerCase().trim());
      const uniqueTexts = new Set(optionTexts);
      if (uniqueTexts.size < optionTexts.length) {
        errors.push('Hay opciones duplicadas');
      }
    }

    // 4. Detectar patrones de alucinación
    const hallucinationPatterns = this.detectHallucinations(formattedQuestion, theme);
    warnings.push(...hallucinationPatterns);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateQualityScore(formattedQuestion, errors, warnings)
    };
  }

  /**
   * Detecta posibles alucinaciones en la pregunta
   * @param {Object} formattedQuestion 
   * @param {string} theme 
   * @returns {string[]} Array de advertencias
   */
  detectHallucinations(formattedQuestion, theme) {
    const warnings = [];
    const fullText = `${formattedQuestion.questionText} ${formattedQuestion.options.map(o => o.text).join(' ')}`;

    // Patrones sospechosos que suelen indicar alucinaciones
    const suspiciousPatterns = [
      // Fechas imposibles o sospechosas
      {
        regex: /\b(19|20)\d{2}\b/g,
        check: (matches) => {
          const years = matches.map(m => parseInt(m));
          // Advertir si hay años futuros o muy antiguos en contextos modernos
          if (years.some(y => y > 2025)) {
            return 'Contiene fechas futuras (posible alucinación)';
          }
          return null;
        }
      },
      
      // Nombres muy específicos o raros (posible invención)
      {
        regex: /\b[A-Z][a-z]+\s+de\s+la\s+[A-Z][a-z]+\b/g,
        check: (matches) => {
          if (matches && matches.length > 0 && matches.some(m => m.length > 30)) {
            return 'Nombres muy específicos o complejos (verificar autenticidad)';
          }
          return null;
        }
      },

      // Títulos entre comillas que podrían ser inventados
      {
        regex: /"([^"]{15,})"/g,
        check: (matches) => {
          if (matches && matches.length > 2) {
            return 'Múltiples títulos entre comillas (verificar que existan)';
          }
          return null;
        }
      },

      // Números muy específicos que parecen inventados
      {
        regex: /\b\d{4,}\b/g,
        check: (matches) => {
          if (matches && matches.some(m => m.length > 6)) {
            return 'Números muy específicos (verificar precisión)';
          }
          return null;
        }
      }
    ];

    suspiciousPatterns.forEach(pattern => {
      const matches = fullText.match(pattern.regex);
      if (matches) {
        const warning = pattern.check(matches);
        if (warning) warnings.push(warning);
      }
    });

    // Validaciones específicas por tema
    if (theme.toLowerCase().includes('linux') || theme.toLowerCase().includes('programación')) {
      // Para temas técnicos, validar que los comandos/conceptos sean reales
      if (fullText.match(/\b[a-z]{15,}\b/g)) {
        warnings.push('Contiene palabras técnicas muy largas (verificar que existan)');
      }
    }

    return warnings;
  }

  /**
   * Calcula un score de calidad de la pregunta
   * @param {Object} formattedQuestion 
   * @param {string[]} errors 
   * @param {string[]} warnings 
   * @returns {number} Score de 0-100
   */
  calculateQualityScore(formattedQuestion, errors, warnings) {
    let score = 100;

    // Penalizaciones por errores críticos
    score -= errors.length * 25;

    // Penalizaciones por advertencias
    score -= warnings.length * 10;

    // Bonus por buena estructura
    if (formattedQuestion.questionText && formattedQuestion.questionText.length > 20) {
      score += 5;
    }

    if (formattedQuestion.options && formattedQuestion.options.every(opt => opt.text.length > 5)) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Valida múltiples preguntas y retorna estadísticas
   * @param {Array} questions 
   * @param {string} theme 
   * @returns {Object}
   */
  validateBatch(questions, theme = '') {
    const results = questions.map(q => this.validate(q, theme));
    
    return {
      total: questions.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      results
    };
  }
}

module.exports = new QuestionValidator();
