const request = require('supertest');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(os.tmpdir(), `se-material-edit-remove-${process.pid}`);
process.env.MATERIAL_STORAGE_DIR = STORAGE_DIR;

const app = require('../src/app');
const Material = require('../src/models/Material');
const MaterialShare = require('../src/models/MaterialShare');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/materials';
const pdfBuffer = Buffer.from('%PDF-1.7\nEdit remove test\n%%EOF');

let owner;
let otherUser;

async function uploadMaterial(user) {
  return request(app)
    .post(URL)
    .set('Authorization', `Bearer ${user.token}`)
    .field('title', 'Original title')
    .field('subject', 'Original subject')
    .field('description', 'Original description')
    .attach('file', pdfBuffer, {
      filename: 'edit-remove-test.pdf',
      contentType: 'application/pdf',
    });
}

beforeAll(startDB);

beforeEach(async () => {
  owner = await tokenFor('Student');
  otherUser = await tokenFor('Student');
  await fs.rm(STORAGE_DIR, { recursive: true, force: true });
});

afterEach(async () => {
  await clearDB();
  await fs.rm(STORAGE_DIR, { recursive: true, force: true });
});

afterAll(async () => {
  await stopDB();
  await fs.rm(STORAGE_DIR, { recursive: true, force: true });
});

describe('Material editing and removal', () => {
  test('owner can edit material metadata', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const response = await request(app)
      .patch(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        title: 'Updated title',
        subject: 'Updated subject',
        description: 'Updated description',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: uploaded.body.id,
      title: 'Updated title',
      subject: 'Updated subject',
      description: 'Updated description',
    });

    const saved = await Material.findById(uploaded.body.id);
    expect(saved.title).toBe('Updated title');
  });

  test('owner can replace the file and download matches the replacement checksum', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);
    const original = await Material.findById(uploaded.body.id);
    const oldPath = original.storagePath;
    const replacementBytes = Buffer.from('%PDF-1.7\nReplacement material\n%%EOF');

    const response = await request(app)
      .patch(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .field('title', 'Replaced material')
      .field('subject', 'Replacement subject')
      .field('description', 'Replacement description')
      .attach('file', replacementBytes, {
        filename: 'replacement.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      title: 'Replaced material',
      originalName: 'replacement.pdf',
      mimeType: 'application/pdf',
      size: replacementBytes.length,
      checksum: crypto.createHash('sha256').update(replacementBytes).digest('hex'),
    });

    const saved = await Material.findById(uploaded.body.id);
    expect(saved.storagePath).not.toBe(oldPath);
    await expect(fs.access(oldPath)).rejects.toThrow();

    const downloaded = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(downloaded.status).toBe(200);
    expect(Buffer.from(downloaded.body)).toEqual(replacementBytes);
    expect(crypto.createHash('sha256').update(downloaded.body).digest('hex'))
      .toBe(response.body.checksum);
  });

  test('failed replacement persistence keeps the previous record and file and does not report success', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);
    const original = await Material.findById(uploaded.body.id);
    const originalPath = original.storagePath;
    const replacementBytes = Buffer.from('%PDF-1.7\nUncommitted replacement\n%%EOF');
    const saveSpy = jest.spyOn(Material.prototype, 'save')
      .mockRejectedValueOnce(new Error('simulated replacement persistence failure'));

    let response;
    try {
      response = await request(app)
        .patch(`${URL}/${uploaded.body.id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .field('title', 'Must not be committed')
        .attach('file', replacementBytes, {
          filename: 'uncommitted.pdf',
          contentType: 'application/pdf',
        });
    } finally {
      saveSpy.mockRestore();
    }

    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('title', 'Must not be committed');
    const saved = await Material.findById(uploaded.body.id);
    expect(saved.title).toBe('Original title');
    expect(saved.storagePath).toBe(originalPath);
    expect(await fs.readFile(originalPath)).toEqual(pdfBuffer);
    expect(await fs.readdir(STORAGE_DIR)).toEqual([path.basename(originalPath)]);
  });

  test('another user cannot edit or delete material', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    await MaterialShare.create({
      material: uploaded.body.id,
      owner: owner.id,
      recipient: otherUser.id,
      revokedAt: null,
    });

    const edit = await request(app)
      .patch(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${otherUser.token}`)
      .send({ title: 'Unauthorized title' });

    const remove = await request(app)
      .delete(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(edit.status).toBe(403);
    expect(edit.body.error.message).toBe('Access denied');
    expect(remove.status).toBe(403);
    expect(remove.body.error.message).toBe('Access denied');
    const saved = await Material.findById(uploaded.body.id);

    expect(saved).not.toBeNull();
    expect(saved.title).toBe('Original title');
    expect(saved.subject).toBe('Original subject');
    expect(saved.description).toBe('Original description');

    const share = await MaterialShare.findOne({
      material: uploaded.body.id,
      recipient: otherUser.id,
    });
    expect(share).not.toBeNull();
    expect(share.revokedAt).toBeNull();
  });

  test('owner can delete material and its stored file', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const saved = await Material.findById(uploaded.body.id);
    const storedPath = saved.storagePath;

    const response = await request(app)
      .delete(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(await Material.findById(uploaded.body.id)).toBeNull();
    await expect(fs.access(storedPath)).rejects.toThrow();
  });

  test('editing with an empty title is rejected', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const response = await request(app)
      .patch(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: '   ' });

    expect(response.status).toBe(400);
    expect((await Material.findById(uploaded.body.id)).title).toBe('Original title');
  });

  test('failed metadata persistence leaves the previous material state and does not report success', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const saveSpy = jest.spyOn(Material.prototype, 'save')
      .mockRejectedValueOnce(new Error('simulated material update failure'));

    let response;
    try {
      response = await request(app)
        .patch(`${URL}/${uploaded.body.id}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Uncommitted title' });
    } finally {
      saveSpy.mockRestore();
    }

    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('title', 'Uncommitted title');
    const saved = await Material.findById(uploaded.body.id);
    expect(saved.title).toBe('Original title');
    expect(saved.subject).toBe('Original subject');
    expect(saved.description).toBe('Original description');
  });

  test('failed file removal restores the material, shares, and previous file without reporting success', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    await MaterialShare.create({
      material: uploaded.body.id,
      owner: owner.id,
      recipient: otherUser.id,
      revokedAt: null,
    });
    const saved = await Material.findById(uploaded.body.id);
    const storedPath = saved.storagePath;
    const unlinkSpy = jest.spyOn(fs, 'unlink')
      .mockRejectedValueOnce(Object.assign(new Error('simulated file removal failure'), { code: 'EACCES' }));

    let response;
    try {
      response = await request(app)
        .delete(`${URL}/${uploaded.body.id}`)
        .set('Authorization', `Bearer ${owner.token}`);
    } finally {
      unlinkSpy.mockRestore();
    }

    expect(response.status).toBe(500);
    expect(response.body).not.toHaveProperty('message', 'Material deleted successfully');
    const restored = await Material.findById(uploaded.body.id);
    expect(restored).not.toBeNull();
    expect(restored.title).toBe('Original title');
    expect(await fs.readFile(storedPath)).toEqual(pdfBuffer);

    const restoredShare = await MaterialShare.findOne({
      material: uploaded.body.id,
      recipient: otherUser.id,
    });
    expect(restoredShare).not.toBeNull();
    expect(restoredShare.revokedAt).toBeNull();
  });

  test('deleted material cannot be viewed afterwards', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const removed = await request(app)
      .delete(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(removed.status).toBe(200);

    const details = await request(app)
      .get(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(details.status).toBe(404);
  });

  test('deleting a material also removes its sharing records', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    await MaterialShare.create({
      material: uploaded.body.id,
      owner: owner.id,
      recipient: otherUser.id,
      revokedAt: null,
    });

    const response = await request(app)
      .delete(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(await MaterialShare.countDocuments({ material: uploaded.body.id })).toBe(0);
  });
});
