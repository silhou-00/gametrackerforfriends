import apiClient from '@/api/client';
import { Player } from './types';

export const playersService = {
  async addPlayer(matchId: string, name: string): Promise<Player> {
    const response = await apiClient.post<{ data: Player }>('/players', {
      matchId,
      name,
    });
    return response.data.data;
  },

  async updateScore(playerId: string, delta: number): Promise<Player> {
    const response = await apiClient.patch<{ data: Player }>(`/players/${playerId}/score`, {
      delta,
    });
    return response.data.data;
  },

  async listPlayers(matchId: string): Promise<Player[]> {
    const response = await apiClient.get<{ data: Player[] }>(`/matches/${matchId}/players`);
    return response.data.data;
  },
};
