// tests/integration/intensiveFlow.test.js
const request = require('supertest');
const express = require('express');
const intensiveController = require('../../controllers/intensiveController');
const intensiveService = require('../../services/intensiveService');
const sessionRepository = require('../../repositories/sessionRepository');
const challengeRepository = require('../../repositories/challengeRepository');

// Mock de los servicios y repositorios
jest.mock('../../services/intensiveService');
jest.mock('../../repositories/sessionRepository');
jest.mock('../../repositories/challengeRepository');

// Crear app de prueba
const app = express();
app.use(express.json());
app.post('/intensive/start', intensiveController.startSession);
app.post('/intensive/save-results', intensiveController.saveResults);
app.get('/intensive/user-themes/:userId', intensiveController.getUserThemes);

describe('Intensive Review Flow - Integration Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /intensive/start', () => {
    it('debería iniciar una sesión intensiva completa', async () => {
      const mockChallenges = [
        { id: 1, theme: 'JavaScript', question: 'Test 1', options: '["A","B","C","D"]', correct_answer: 'A' },
        { id: 2, theme: 'JavaScript', question: 'Test 2', options: '["A","B","C","D"]', correct_answer: 'B' },
      ];

      intensiveService.getChallengesForSession.mockResolvedValue(mockChallenges);
      sessionRepository.createIntensiveSession.mockResolvedValue('test-uuid-123');

      const response = await request(app)
        .post('/intensive/start')
        .send({
          userId: 1,
          theme: 'JavaScript',
          gameMode: 'timed',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('gameMode', 'timed');
      expect(response.body).toHaveProperty('challenges');
      expect(response.body.challenges).toHaveLength(2);
      expect(response.body.challenges[0].options).toBeInstanceOf(Array);
    });

    it('debería retornar 404 si no hay challenges disponibles', async () => {
      intensiveService.getChallengesForSession.mockResolvedValue([]);

      const response = await request(app)
        .post('/intensive/start')
        .send({
          userId: 1,
          theme: 'Python',
          gameMode: 'survival',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No hay retos para este tema');
    });

    it('debería manejar errores del servicio', async () => {
      intensiveService.getChallengesForSession.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/intensive/start')
        .send({
          userId: 1,
          theme: 'JavaScript',
          gameMode: 'timed',
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Error al iniciar sesión de repaso');
    });
  });

  describe('POST /intensive/save-results', () => {
    it('debería guardar resultados exitosamente', async () => {
      const mockSession = {
        user_id: 1,
        theme: 'JavaScript',
      };

      sessionRepository.findById.mockResolvedValue(mockSession);
      sessionRepository.updateSessionResults.mockResolvedValue(true);
      sessionRepository.saveMultipleSessionChallenges.mockResolvedValue(true);

      const response = await request(app)
        .post('/intensive/save-results')
        .send({
          sessionId: 'test-uuid-123',
          correctAnswers: [1, 2, 3],
          incorrectAnswers: [4, 5],
          gameMode: 'timed',
          timeUsed: 120,
          theme: 'JavaScript',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('points');
      expect(response.body).toHaveProperty('accuracy');
    });

    it('debería retornar 404 si la sesión no existe', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/intensive/save-results')
        .send({
          sessionId: 'invalid-uuid',
          correctAnswers: [1],
          incorrectAnswers: [2],
          gameMode: 'timed',
          timeUsed: 60,
          theme: 'JavaScript',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Sesión no encontrada');
    });
  });

  describe('GET /intensive/user-themes/:userId', () => {
    it('debería obtener temas del usuario', async () => {
      const mockThemes = ['JavaScript', 'Python', 'Node.js'];
      challengeRepository.findUniqueThemesByUser.mockResolvedValue(mockThemes);

      const response = await request(app)
        .get('/intensive/user-themes/1');

      expect(response.status).toBe(200);
      expect(response.body.themes).toEqual(mockThemes);
      expect(response.body.themes).toHaveLength(3);
    });

    it('debería retornar array vacío si no hay temas', async () => {
      challengeRepository.findUniqueThemesByUser.mockResolvedValue([]);

      const response = await request(app)
        .get('/intensive/user-themes/999');

      expect(response.status).toBe(200);
      expect(response.body.themes).toEqual([]);
    });
  });

  describe('Flujo completo: Start → Save Results', () => {
    it('debería completar flujo de sesión timed', async () => {
      // 1. Iniciar sesión
      const mockChallenges = [
        { id: 1, theme: 'JavaScript', question: 'Q1', options: '["A","B"]', correct_answer: 'A' },
        { id: 2, theme: 'JavaScript', question: 'Q2', options: '["A","B"]', correct_answer: 'B' },
      ];

      intensiveService.getChallengesForSession.mockResolvedValue(mockChallenges);
      sessionRepository.createIntensiveSession.mockResolvedValue('session-123');

      const startResponse = await request(app)
        .post('/intensive/start')
        .send({ userId: 1, theme: 'JavaScript', gameMode: 'timed' });

      expect(startResponse.status).toBe(200);
      const { sessionId } = startResponse.body;

      // 2. Guardar resultados
      sessionRepository.findById.mockResolvedValue({ user_id: 1, theme: 'JavaScript' });
      sessionRepository.updateSessionResults.mockResolvedValue(true);
      sessionRepository.saveMultipleSessionChallenges.mockResolvedValue(true);

      const saveResponse = await request(app)
        .post('/intensive/save-results')
        .send({
          sessionId,
          correctAnswers: [1],
          incorrectAnswers: [2],
          gameMode: 'timed',
          timeUsed: 90,
          theme: 'JavaScript',
        });

      expect(saveResponse.status).toBe(200);
      expect(saveResponse.body.accuracy).toBe(50);
    });
  });
});
