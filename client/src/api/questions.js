import api from './client';

/** Question Bank API calls (#13 – #15). */

// #13
export const createQuestion = (data) => api.post('/questions', data).then((r) => r.data);

// #14 – params: { q, topic, difficulty, page, limit }; empty values are left out.
export const searchQuestions = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));
  return api.get('/questions', { params: clean }).then((r) => r.data);
};

export const listTopics = () => api.get('/questions/topics').then((r) => r.data.topics);

// #15
export const getQuestion = (id) => api.get(`/questions/${id}`).then((r) => r.data);
export const updateQuestion = (id, data) => api.put(`/questions/${id}`, data).then((r) => r.data);
export const deleteQuestion = (id) => api.delete(`/questions/${id}`);
