import api from './client';

export async function getMyPerformance() {
  const response = await api.get('/performance/mine');
  return response.data;
}