import apiClient from '@/api/client';
import { AuditLog } from './types';

export const auditService = {
  async listLogs(matchId: string): Promise<AuditLog[]> {
    const response = await apiClient.get<{ data: AuditLog[] }>(`/matches/${matchId}/audit`);
    return response.data.data;
  },
};
