// tests/unit/metricsService.test.js
const metricsService = require('../../services/metricsService');
const metricsRepository = require('../../repositories/metricsRepository');

// Mock de los repositorios
jest.mock('../../repositories/metricsRepository');

describe('MetricsService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserOverallMetrics', () => {
    it('debería obtener métricas generales del usuario', async () => {
      const mockMetrics = {
        user_id: 1,
        total_points: 1500,
        total_sessions: 25,
        average_accuracy: 85.5,
      };

      metricsRepository.getUserMetrics.mockResolvedValue(mockMetrics);

      const result = await metricsService.getUserOverallMetrics(1);

      expect(metricsRepository.getUserMetrics).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockMetrics);
    });

    it('debería manejar cuando no hay métricas', async () => {
      metricsRepository.getUserMetrics.mockResolvedValue(null);

      const result = await metricsService.getUserOverallMetrics(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserSessions', () => {
    it('debería obtener sesiones recientes con límite por defecto', async () => {
      const mockSessions = [
        { id: 1, accuracy: 90, points_earned: 100 },
        { id: 2, accuracy: 85, points_earned: 80 },
      ];

      metricsRepository.getRecentSessions.mockResolvedValue(mockSessions);

      const result = await metricsService.getUserSessions(1);

      expect(metricsRepository.getRecentSessions).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockSessions);
      expect(result).toHaveLength(2);
    });

    it('debería respetar el límite personalizado', async () => {
      const mockSessions = [
        { id: 1, accuracy: 90 },
        { id: 2, accuracy: 85 },
        { id: 3, accuracy: 88 },
        { id: 4, accuracy: 92 },
        { id: 5, accuracy: 87 },
      ];

      metricsRepository.getRecentSessions.mockResolvedValue(mockSessions);

      const result = await metricsService.getUserSessions(1, 5);

      expect(metricsRepository.getRecentSessions).toHaveBeenCalledWith(1, 5);
      expect(result).toHaveLength(5);
    });
  });

  describe('getUserThemeProgress', () => {
    it('debería obtener progreso por temas', async () => {
      const mockThemeProgress = [
        { theme: 'JavaScript', average_accuracy: 90, total_sessions: 10 },
        { theme: 'Python', average_accuracy: 85, total_sessions: 8 },
      ];

      metricsRepository.getThemeProgress.mockResolvedValue(mockThemeProgress);

      const result = await metricsService.getUserThemeProgress(1);

      expect(metricsRepository.getThemeProgress).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockThemeProgress);
      expect(result[0].theme).toBe('JavaScript');
    });
  });

  describe('getUserProgressTimeline', () => {
    it('debería obtener timeline con días por defecto', async () => {
      const mockTimeline = [
        { date: '2025-11-01', sessions_count: 3, daily_accuracy: 88 },
        { date: '2025-11-02', sessions_count: 2, daily_accuracy: 92 },
      ];

      metricsRepository.getProgressTimeline.mockResolvedValue(mockTimeline);

      const result = await metricsService.getUserProgressTimeline(1);

      expect(metricsRepository.getProgressTimeline).toHaveBeenCalledWith(1, 30);
      expect(result).toEqual(mockTimeline);
    });

    it('debería respetar el número de días personalizado', async () => {
      const mockTimeline = [
        { date: '2025-11-29', sessions_count: 5 },
        { date: '2025-11-30', sessions_count: 3 },
      ];

      metricsRepository.getProgressTimeline.mockResolvedValue(mockTimeline);

      const result = await metricsService.getUserProgressTimeline(1, 7);

      expect(metricsRepository.getProgressTimeline).toHaveBeenCalledWith(1, 7);
      expect(result).toHaveLength(2);
    });
  });

  describe('getUserGameModeStats', () => {
    it('debería obtener estadísticas por modo de juego', async () => {
      const mockStats = [
        { game_mode: 'timed', total_sessions: 15, average_accuracy: 87 },
        { game_mode: 'survival', total_sessions: 10, average_accuracy: 82 },
      ];

      metricsRepository.getGameModeStats.mockResolvedValue(mockStats);

      const result = await metricsService.getUserGameModeStats(1);

      expect(metricsRepository.getGameModeStats).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockStats);
      expect(result).toHaveLength(2);
    });

    it('debería retornar array vacío si no hay estadísticas', async () => {
      metricsRepository.getGameModeStats.mockResolvedValue([]);

      const result = await metricsService.getUserGameModeStats(999);

      expect(result).toEqual([]);
    });
  });
});
