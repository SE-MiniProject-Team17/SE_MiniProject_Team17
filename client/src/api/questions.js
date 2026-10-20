import api from './client';

/** Question Bank API calls (#13 – #15). */
export const createQuestion = (data) => api.post('/questions', data).then((r) => r.data);
