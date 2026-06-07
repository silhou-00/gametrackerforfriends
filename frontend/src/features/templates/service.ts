import apiClient from '@/api/client';
import { GameTemplate, RulesConfig } from './types';

export const templatesService = {
  async listTemplates(): Promise<GameTemplate[]> {
    const response = await apiClient.get<{ data: GameTemplate[] }>('/templates');
    return response.data.data;
  },

  async getTemplate(id: string): Promise<GameTemplate> {
    const response = await apiClient.get<{ data: GameTemplate }>(`/templates/${id}`);
    return response.data.data;
  },

  async createTemplate(
    name: string,
    description: string | null,
    rulesConfig: RulesConfig
  ): Promise<GameTemplate> {
    const response = await apiClient.post<{ data: GameTemplate }>('/templates', {
      name,
      description,
      rulesConfig,
    });
    return response.data.data;
  },

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/templates/${id}`);
  },
};
