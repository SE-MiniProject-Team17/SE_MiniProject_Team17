import api from './client';

export async function getMyPerformance() {
  const response = await api.get('/performance/mine');
  return response.data;
}

export async function getMyTopicPerformance() {
  const response = await api.get('/performance/topics');
  return response.data;
}

export async function getFacultyPerformanceDashboard() {
  const response = await api.get('/performance/faculty');
  return response.data;
}
