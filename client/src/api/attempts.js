
import api from './client';

export async function submitAttempt(quizId, answers) {
  const { data } = await api.post(`/attempts/${quizId}/submit`, {
    answers,
  });
  return data;
}

export async function getAttemptResult(attemptId) {
  const { data } = await api.get(`/attempts/${attemptId}/result`);
  return data;
}
