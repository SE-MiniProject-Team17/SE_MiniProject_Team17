import api from './client';

export const createQuiz = (data) => api.post('/quizzes', data).then((r) => r.data);
export const listMyQuizzes = () => api.get('/quizzes/mine').then((r) => r.data.quizzes);
export const getQuiz = (id) => api.get(`/quizzes/${id}`).then((r) => r.data);
export const updateQuiz = (id, data) => api.put(`/quizzes/${id}`, data).then((r) => r.data);
export const publishQuiz = (id) => api.post(`/quizzes/${id}/publish`).then((r) => r.data);
export const deleteQuiz = (id) => api.delete(`/quizzes/${id}`).then((r) => r.data);
export const getQuizSubmissions = (id) => api.get(`/quizzes/${id}/submissions`).then((r) => r.data);
export const listAvailableQuizzes = () => api.get('/quizzes/available').then((r) => r.data.quizzes);
export const startQuizAttempt = (id) => api.post(`/quizzes/${id}/attempts`).then((r) => r.data.attempt);

export const getQuizAttempt = (attemptId) =>
  api.get(`/quizzes/attempts/${attemptId}`).then((r) => r.data.attempt);

export const saveQuizAnswer = (attemptId, questionId, selectedOption) =>
  api.patch(`/quizzes/attempts/${attemptId}/answers`, { questionId, selectedOption })
    .then((r) => r.data.result);

export const submitQuizAttempt = (attemptId) =>
  api.post(`/quizzes/attempts/${attemptId}/submit`).then((r) => r.data.attempt);
