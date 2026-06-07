import apiClient from '@/api/client';
import { Match, MatchStatus } from './types';

export const matchesService = {
  async createMatch(templateId: string): Promise<Match> {
    const response = await apiClient.post<{ data: Match }>('/matches', {
      templateId,
    });
    return response.data.data;
  },

  async startMatch(matchId: string): Promise<Match> {
    const response = await apiClient.patch<{ data: Match }>(`/matches/${matchId}/start`, {});
    return response.data.data;
  },

  async getMatch(matchId: string): Promise<Match> {
    const response = await apiClient.get<{ data: Match }>(`/matches/${matchId}`);
    return response.data.data;
  },

  async completeMatch(matchId: string, winnerPlayerId: string): Promise<Match> {
    const response = await apiClient.patch<{ data: Match }>(`/matches/${matchId}/complete`, {
      winnerPlayerId,
    });
    return response.data.data;
  },

  async getActiveMatch(): Promise<Match | null> {
    try {
      const response = await apiClient.get<{ data: Match }>('/matches/active');
      return response.data.data;
    } catch (error) {
      return null;
    }
  },
};
