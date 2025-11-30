// tests/unit/challengeRepository.test.js
const challengeRepository = require('../../repositories/challengeRepository');

// Mock del pool de conexiones
jest.mock('../../config/db', () => ({
  getConnection: jest.fn(),
}));

const pool = require('../../config/db');

describe('ChallengeRepository', () => {
  let mockConnection;

  beforeEach(() => {
    // Setup del mock de conexión antes de cada test
    mockConnection = {
      execute: jest.fn(),
      release: jest.fn(),
    };
    pool.getConnection.mockResolvedValue(mockConnection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('debería guardar un challenge correctamente', async () => {
      const challengeData = {
        theme: 'JavaScript',
        level: 'intermedio',
        question: '¿Qué es un closure?',
        options: JSON.stringify(['A', 'B', 'C', 'D']),
        correctAnswer: 'A',
        rawResponse: 'raw text',
        userId: 1,
        deliveryTime: '09:00:00',
        frequency: 'daily',
      };

      const mockResult = { insertId: 123 };
      mockConnection.execute.mockResolvedValue([mockResult]);

      const result = await challengeRepository.save(challengeData);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO questions'),
        expect.arrayContaining([
          challengeData.theme,
          challengeData.level,
          challengeData.question,
          challengeData.options,
          challengeData.correctAnswer,
          challengeData.rawResponse,
          challengeData.userId,
          challengeData.deliveryTime,
          challengeData.frequency,
        ])
      );
      expect(result).toBe(123);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('debería liberar la conexión incluso si hay error', async () => {
      const challengeData = {
        theme: 'JavaScript',
        userId: 1,
      };

      mockConnection.execute.mockRejectedValue(new Error('DB Error'));

      await expect(challengeRepository.save(challengeData)).rejects.toThrow('DB Error');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('findByThemeAndUser', () => {
    it('debería encontrar challenges por tema y usuario', async () => {
      const mockChallenges = [
        { id: 1, theme: 'JavaScript', question: 'Test 1' },
        { id: 2, theme: 'JavaScript', question: 'Test 2' },
      ];

      mockConnection.execute.mockResolvedValue([mockChallenges]);

      const result = await challengeRepository.findByThemeAndUser(1, 'JavaScript', 10);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1, '%JavaScript%', 10])
      );
      expect(result).toEqual(mockChallenges);
      expect(result).toHaveLength(2);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('debería retornar array vacío si no hay challenges', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await challengeRepository.findByThemeAndUser(1, 'Python', 5);

      expect(result).toEqual([]);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('debería encontrar un challenge por ID', async () => {
      const mockChallenge = { id: 1, theme: 'JavaScript', question: 'Test' };
      mockConnection.execute.mockResolvedValue([[mockChallenge]]);

      const result = await challengeRepository.findById(1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = ?'),
        [1]
      );
      expect(result).toEqual(mockChallenge);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('debería retornar null si no existe el challenge', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await challengeRepository.findById(999);

      expect(result).toBeNull();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getCorrectAnswer', () => {
    it('debería obtener la respuesta correcta de un challenge', async () => {
      const mockAnswer = { correct_answer: 'A' };
      mockConnection.execute.mockResolvedValue([[mockAnswer]]);

      const result = await challengeRepository.getCorrectAnswer(1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT correct_answer'),
        [1]
      );
      expect(result).toBe('A');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('debería retornar null si no existe el challenge', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await challengeRepository.getCorrectAnswer(999);

      expect(result).toBeNull();
    });
  });

  describe('updateDisplayStatus', () => {
    it('debería actualizar el estado de visualización', async () => {
      mockConnection.execute.mockResolvedValue([{ affectedRows: 1 }]);

      const result = await challengeRepository.updateDisplayStatus(1, 'displayed');

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE questions'),
        ['displayed', 1]
      );
      expect(result).toBe(true);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('findUniqueThemesByUser', () => {
    it('debería obtener temas únicos del usuario', async () => {
      const mockThemes = [
        { theme: 'JavaScript' },
        { theme: 'Python' },
        { theme: 'Node.js' },
      ];
      mockConnection.execute.mockResolvedValue([mockThemes]);

      const result = await challengeRepository.findUniqueThemesByUser(1);

      expect(mockConnection.execute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT theme'),
        [1]
      );
      expect(result).toEqual(['JavaScript', 'Python', 'Node.js']);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('debería retornar array vacío si el usuario no tiene temas', async () => {
      mockConnection.execute.mockResolvedValue([[]]);

      const result = await challengeRepository.findUniqueThemesByUser(999);

      expect(result).toEqual([]);
    });
  });
});
