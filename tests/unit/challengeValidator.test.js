// tests/unit/challengeValidator.test.js
const request = require('supertest');
const express = require('express');
const {
  validateChallengeGeneration,
  validateGroqGeneration,
  validateChallengeResponse,
} = require('../../middlewares/validators/challengeValidator');

// Crear app de prueba
const createTestApp = (validator) => {
  const app = express();
  app.use(express.json());
  app.post('/test', validator, (req, res) => {
    res.status(200).json({ success: true });
  });
  return app;
};

describe('Challenge Validators', () => {
  describe('validateChallengeGeneration', () => {
    const app = createTestApp(validateChallengeGeneration);

    it('debería pasar con datos válidos', async () => {
      const validData = {
        userId: 1,
        theme: 'JavaScript ES6',
        level: 'intermedio',
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('debería fallar sin userId', async () => {
      const invalidData = {
        theme: 'JavaScript',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Errores de validación');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'userId es requerido',
            param: 'userId',
          }),
        ])
      );
    });

    it('debería fallar con userId inválido', async () => {
      const invalidData = {
        userId: 'abc',
        theme: 'JavaScript',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'userId debe ser un número entero positivo',
          }),
        ])
      );
    });

    it('debería fallar con theme muy corto', async () => {
      const invalidData = {
        userId: 1,
        theme: 'J',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'theme debe tener entre 2 y 100 caracteres',
          }),
        ])
      );
    });

    it('debería fallar con level inválido', async () => {
      const invalidData = {
        userId: 1,
        theme: 'JavaScript',
        level: 'super-avanzado',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'level debe ser: básico, intermedio o avanzado',
          }),
        ])
      );
    });
  });

  describe('validateGroqGeneration', () => {
    const app = createTestApp(validateGroqGeneration);

    it('debería pasar con datos válidos', async () => {
      const validData = {
        userId: 1,
        theme: 'React Hooks',
        level: 'avanzado',
        previousQuestions: ['Q1', 'Q2'],
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
    });

    it('debería requerir level (no opcional como en validateChallengeGeneration)', async () => {
      const invalidData = {
        userId: 1,
        theme: 'React',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'level es requerido',
          }),
        ])
      );
    });

    it('debería aceptar previousQuestions como array', async () => {
      const validData = {
        userId: 1,
        theme: 'Vue.js',
        level: 'básico',
        previousQuestions: [],
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
    });
  });

  describe('validateChallengeResponse', () => {
    const app = createTestApp(validateChallengeResponse);

    it('debería pasar con respuesta válida', async () => {
      const validData = {
        userId: 1,
        challengeId: 42,
        userAnswer: 'A',
        isCorrect: true,
      };

      const response = await request(app)
        .post('/test')
        .send(validData);

      expect(response.status).toBe(200);
    });

    it('debería fallar sin todos los campos requeridos', async () => {
      const invalidData = {
        userId: 1,
        challengeId: 42,
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details.length).toBeGreaterThanOrEqual(2);
    });

    it('debería validar que isCorrect sea booleano', async () => {
      const invalidData = {
        userId: 1,
        challengeId: 42,
        userAnswer: 'A',
        isCorrect: 'yes',
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'isCorrect debe ser un booleano',
          }),
        ])
      );
    });

    it('debería validar longitud de userAnswer', async () => {
      const invalidData = {
        userId: 1,
        challengeId: 42,
        userAnswer: 'A'.repeat(501), // Más de 500 caracteres
        isCorrect: true,
      };

      const response = await request(app)
        .post('/test')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            msg: 'userAnswer debe tener entre 1 y 500 caracteres',
          }),
        ])
      );
    });
  });
});
