const request = require('supertest');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(os.tmpdir(), `se-material-access-${process.pid}`);
process.env.MATERIAL_STORAGE_DIR = STORAGE_DIR;

const app = require('../src/app');
const Material = require('../src/models/Material');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/materials';
const pdfBuffer = Buffer.from('%PDF-1.7\nDownload test content\n%%EOF');

let owner;
let otherUser;

async function uploadMaterial(user) {
  return request(app)
    .post(URL)
    .set('Authorization', `Bearer ${user.token}`)
    .field('title', 'Download Test')
    .field('subject', 'Testing')
    .field('description', 'Material access test')
    .attach('file', pdfBuffer, {
      filename: 'download-test.pdf',
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

describe('Material viewing and downloading', () => {
  test('owner can view material details without exposing storage path', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const response = await request(app)
      .get(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: uploaded.body.id,
      title: 'Download Test',
      uploadedBy: owner.id,
    });
    expect(response.body.storagePath).toBeUndefined();
  });

  test('owner can download the exact original file', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const response = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('download-test.pdf');
    expect(Buffer.from(response.body)).toEqual(pdfBuffer);
    expect(
      crypto.createHash('sha256').update(response.body).digest('hex')
    ).toBe(uploaded.body.checksum);
  });

  test('another user cannot view or download the material', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const details = await request(app)
      .get(`${URL}/${uploaded.body.id}`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    const download = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`)
      .set('Authorization', `Bearer ${otherUser.token}`);

    expect(details.status).toBe(403);
    expect(download.status).toBe(403);
    expect(details.body.error.message).toBe('Access denied');
    expect(download.body.error.message).toBe('Access denied');
  });

  test('missing stored file returns unavailable without file details', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const material = await Material.findById(uploaded.body.id);
    await fs.unlink(material.storagePath);

    const response = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Material unavailable');
    expect(JSON.stringify(response.body)).not.toContain(material.storagePath);
  });

  test('missing material returns unavailable', async () => {
    const response = await request(app)
      .get(`${URL}/507f1f77bcf86cd799439011`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Material unavailable');
  });

  test('download is denied without authentication', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const response = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`);

    expect(response.status).toBe(401);
  });
});

describe('Material download integrity', () => {
  test('rejects a stored file whose checksum no longer matches', async () => {
    const uploaded = await uploadMaterial(owner);
    expect(uploaded.status).toBe(201);

    const material = await Material.findById(uploaded.body.id);
    await fs.writeFile(material.storagePath, Buffer.from('tampered content'));

    const response = await request(app)
      .get(`${URL}/${uploaded.body.id}/download`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Material unavailable');
  });
});
