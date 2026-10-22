import api from './client';

/** Quiz authoring API calls (#16). Quiz-taking calls (#17–#19) can be added here too. */
export const createQuiz = (data) => api.post('/quizzes', data).then((r) => r.data);
export const listMyQuizzes = () => api.get('/quizzes/mine').then((r) => r.data.quizzes);
export const getQuiz = (id) => api.get(`/quizzes/${id}`).then((r) => r.data);
export const updateQuiz = (id, data) => api.put(`/quizzes/${id}`, data).then((r) => r.data);
export const publishQuiz = (id) => api.post(`/quizzes/${id}/publish`).then((r) => r.data);
