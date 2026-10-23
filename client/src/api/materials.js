import api from './client';

export async function getMyMaterials() {
  const { data } = await api.get('/materials/mine');
  return data.materials;
}

export async function uploadMaterial(formData) {
  const { data } = await api.post('/materials', formData);
  return data;
}

export async function getMaterial(id) {
  const { data } = await api.get(`/materials/${id}`);
  return data;
}

export async function downloadMaterial(id) {
  const { data } = await api.get(`/materials/${id}/download`, {
    responseType: 'blob',
  });
  return data;
}

export async function shareMaterial(id, email) {
  const { data } = await api.post(`/materials/${id}/share`, { email });
  return data;
}

export async function revokeMaterialShare(id, recipientId) {
  const { data } = await api.delete(
    `/materials/${id}/share/${recipientId}`
  );
  return data;
}

export async function getSharedMaterials() {
  const { data } = await api.get('/materials/shared');
  return data.materials;
}
