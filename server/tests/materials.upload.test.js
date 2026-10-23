const request = require('supertest');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const STORAGE_DIR = path.join(os.tmpdir(), `se-material-tests-${process.pid}`);
process.env.MATERIAL_STORAGE_DIR = STORAGE_DIR;

const app = require('../src/app');
const Material = require('../src/models/Material');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/materials';
let student;

const validMetadata = () => ({
  title: 'Operating Systems Notes',
  subject: 'Operating Systems',
  description: 'Main memory revision notes',
});

const pdfBuffer = Buffer.from('%PDF-1.7\nTest PDF content\n%%EOF');
const post = (user = student) => {
  const req = request(app).post(URL);
  if (user) req.set('Authorization', `Bearer ${user.token}`);
  return req
    .field('title', validMetadata().title)
    .field('subject', validMetadata().subject)
    .field('description', validMetadata().description)
    .attach('file', pdfBuffer, {
      filename: 'notes.pdf',
      contentType: 'application/pdf',
    });
};

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
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

describe('Material upload and validation', () => {
  test('uploads a PDF, records its owner and verifies SHA-256', async () => {
    const res = await post();

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: validMetadata().title,
      subject: validMetadata().subject,
      originalName: 'notes.pdf',
      mimeType: 'application/pdf',
      uploadedBy: student.id,
      checksum: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
    });

    const saved = await Material.findById(res.body.id);
    expect(saved).not.toBeNull();
    expect(saved.uploadedBy.toString()).toBe(student.id);
    expect(await fs.readFile(saved.storagePath)).toEqual(pdfBuffer);
  });

  test('rejects unauthenticated uploads', async () => {
    const res = await post(null);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('rejects unsupported file types without saving a material', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .field('title', validMetadata().title)
      .field('subject', validMetadata().subject)
      .field('description', validMetadata().description)
      .attach('file', Buffer.from('plain text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('file');
    expect(await Material.countDocuments()).toBe(0);
  });

  test('rejects a PDF with an invalid signature', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .field('title', validMetadata().title)
      .field('subject', validMetadata().subject)
      .field('description', validMetadata().description)
      .attach('file', Buffer.from('not a PDF'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('file');
    expect(await Material.countDocuments()).toBe(0);
  });

  test.each([
    ['title', { title: '' }],
    ['subject', { subject: '' }],
    ['description', { description: '' }],
    ['title', { title: 't'.repeat(101) }],
    ['description', { description: 'd'.repeat(501) }],
  ])('rejects invalid metadata for %s', async (field, override) => {
    const metadata = { ...validMetadata(), ...override };
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .field('title', metadata.title)
      .field('subject', metadata.subject)
      .field('description', metadata.description)
      .attach('file', pdfBuffer, {
        filename: 'notes.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe(field);
    expect(await Material.countDocuments()).toBe(0);
  });

  test('lists only materials belonging to the authenticated user', async () => {
    await post();
    const other = await tokenFor('Student');

    const res = await request(app)
      .get(`${URL}/mine`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ materials: [] });
  });

  test('rejects uploads whose file extension does not match the MIME type', async () => {
    const res = await request(app)
      .post(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .field('title', validMetadata().title)
      .field('subject', validMetadata().subject)
      .field('description', validMetadata().description)
      .attach('file', pdfBuffer, {
        filename: 'notes.png',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('file');
    expect(await Material.countDocuments()).toBe(0);
  });
});
