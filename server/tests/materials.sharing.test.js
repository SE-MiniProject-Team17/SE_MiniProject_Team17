const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Material = require('../src/models/Material');
const MaterialShare = require('../src/models/MaterialShare');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/materials';

let owner;
let recipient;
let stranger;
let material;

async function createUser(label) {
  const user = await tokenFor('Student');
  await User.create({
    _id: user.id,
    fullName: label,
    email: `${label.toLowerCase()}-${user.id}@example.com`,
    passwordHash: 'test-password-hash',
    role: 'Student',
  });
  return user;
}

beforeAll(startDB);

beforeEach(async () => {
  owner = await createUser('Owner');
  recipient = await createUser('Recipient');
  stranger = await createUser('Stranger');

  material = await Material.create({
    title: 'Test Notes',
    subject: 'Computer Science',
    description: 'Test material',
    originalName: 'notes.pdf',
    mimeType: 'application/pdf',
    size: 100,
    storagePath: `test-${materialId()}.pdf`,
    checksum: 'a'.repeat(64),
    uploadedBy: owner.id,
  });

  await MaterialShare.init();
});

function materialId() {
  return new (require('mongoose').Types.ObjectId)().toString();
}

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #8 - Material sharing and revocation', () => {
  test('owner can share material with a registered user', async () => {
    const res = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: `RECIPIENT-${recipient.id}@example.com` });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Material shared successfully');

    const share = await MaterialShare.findOne({
      material: material._id,
      recipient: recipient.id,
    });

    expect(share).not.toBeNull();
    expect(share.revokedAt).toBeNull();
  });

  test('rejects sharing with an unregistered email', async () => {
    const res = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('email');
  });

  test('non-owner cannot share material', async () => {
    const res = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${stranger.token}`)
      .send({ email: `recipient-${recipient.id}@example.com` });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Access denied');
    expect(await MaterialShare.countDocuments()).toBe(0);
  });

  test('rejects duplicate active shares', async () => {
    const payload = { email: `recipient-${recipient.id}@example.com` };

    const first = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(payload);

    const second = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_SHARED');
    expect(await MaterialShare.countDocuments()).toBe(1);
  });

  test('owner can revoke an active share', async () => {
    await MaterialShare.create({
      material: material._id,
      owner: owner.id,
      recipient: recipient.id,
    });

    const res = await request(app)
      .delete(`${URL}/${material._id}/share/${recipient.id}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.revoked).toBe(true);

    const share = await MaterialShare.findOne({
      material: material._id,
      recipient: recipient.id,
    });

    expect(share.revokedAt).toBeInstanceOf(Date);
  });

  test('non-owner cannot revoke a share', async () => {
    await MaterialShare.create({
      material: material._id,
      owner: owner.id,
      recipient: recipient.id,
    });

    const res = await request(app)
      .delete(`${URL}/${material._id}/share/${recipient.id}`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(403);

    const share = await MaterialShare.findOne({
      material: material._id,
      recipient: recipient.id,
    });

    expect(share.revokedAt).toBeNull();
  });

  test('revoked share can be granted again', async () => {
    await MaterialShare.create({
      material: material._id,
      owner: owner.id,
      recipient: recipient.id,
      revokedAt: new Date(),
    });

    const res = await request(app)
      .post(`${URL}/${material._id}/share`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: `recipient-${recipient.id}@example.com` });

    expect(res.status).toBe(201);

    const shares = await MaterialShare.find({
      material: material._id,
      recipient: recipient.id,
    });

    expect(shares).toHaveLength(1);
    expect(shares[0].revokedAt).toBeNull();
  });
});

