
const request = require('supertest');
const crypto = require('crypto');

const app = require('../src/app');
const StudyGroup = require('../src/models/StudyGroup');
const Material = require('../src/models/Material');
const MaterialShare = require('../src/models/MaterialShare');

const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const MODERATION_URL = '/api/moderation';
const GROUPS_URL = '/api/groups';
const MATERIALS_URL = '/api/materials';

const testChecksum = crypto
  .createHash('sha256')
  .update('moderation-test-content')
  .digest('hex');

let admin;
let student;
let faculty;
let recipient;
let group;
let material;

function auth(user) {
  return { Authorization: `Bearer ${user.token}` };
}

beforeAll(startDB);

beforeEach(async () => {
  admin = await tokenFor('Admin');
  student = await tokenFor('Student');
  faculty = await tokenFor('Faculty');
  recipient = await tokenFor('Student');

  group = await StudyGroup.create({
    name: 'Moderation Test Group',
    description: 'Group used for moderation tests',
    createdBy: student.id,
    members: [student.id],
  });

  material = await Material.create({
    title: 'Moderation Test Material',
    subject: 'Testing',
    description: 'Material used for moderation tests',
    originalName: 'moderation-test.pdf',
    mimeType: 'application/pdf',
    size: Buffer.byteLength('moderation-test-content'),
    storagePath: '/tmp/moderation-test.pdf',
    checksum: testChecksum,
    uploadedBy: student.id,
  });
});

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #27 - Collaboration moderation and access control', () => {
  describe('Admin moderation access', () => {
    test('Admin can list groups and materials without sensitive file details', async () => {
      const groupsResponse = await request(app)
        .get(`${MODERATION_URL}/groups`)
        .set(auth(admin));

      const materialsResponse = await request(app)
        .get(`${MODERATION_URL}/materials`)
        .set(auth(admin));

      expect(groupsResponse.status).toBe(200);
      expect(groupsResponse.body.groups).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Moderation Test Group',
            moderationStatus: 'Active',
          }),
        ])
      );

      expect(materialsResponse.status).toBe(200);
      expect(materialsResponse.body.materials).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Moderation Test Material',
            moderationStatus: 'Active',
          }),
        ])
      );

      expect(JSON.stringify(materialsResponse.body)).not.toContain(
        '/tmp/moderation-test.pdf'
      );
      expect(JSON.stringify(materialsResponse.body)).not.toContain(
        testChecksum
      );
    });

    test('Admin can hide and restore a study group', async () => {
      const hideResponse = await request(app)
        .patch(`${MODERATION_URL}/groups/${group.id}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Hidden' });

      expect(hideResponse.status).toBe(200);
      expect(hideResponse.body.moderationStatus).toBe('Hidden');

      expect(
        (await StudyGroup.findById(group.id)).moderationStatus
      ).toBe('Hidden');

      const restoreResponse = await request(app)
        .patch(`${MODERATION_URL}/groups/${group.id}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Active' });

      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body.moderationStatus).toBe('Active');

      expect(
        (await StudyGroup.findById(group.id)).moderationStatus
      ).toBe('Active');
    });

    test('Admin can hide and restore a material', async () => {
      const hideResponse = await request(app)
        .patch(`${MODERATION_URL}/materials/${material.id}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Hidden' });

      expect(hideResponse.status).toBe(200);
      expect(hideResponse.body.moderationStatus).toBe('Hidden');

      expect(
        (await Material.findById(material.id)).moderationStatus
      ).toBe('Hidden');

      const restoreResponse = await request(app)
        .patch(`${MODERATION_URL}/materials/${material.id}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Active' });

      expect(restoreResponse.status).toBe(200);
      expect(restoreResponse.body.moderationStatus).toBe('Active');

      expect(
        (await Material.findById(material.id)).moderationStatus
      ).toBe('Active');
    });

    test('Admin cannot set an invalid moderation status', async () => {
      const response = await request(app)
        .patch(`${MODERATION_URL}/groups/${group.id}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Deleted' });

      expect(response.status).toBe(400);
    });

    test('invalid and missing moderation targets return 404', async () => {
      const invalidResponse = await request(app)
        .patch(`${MODERATION_URL}/groups/not-an-id`)
        .set(auth(admin))
        .send({ moderationStatus: 'Hidden' });

      expect(invalidResponse.status).toBe(404);

      const missingId = '507f1f77bcf86cd799439011';

      const missingResponse = await request(app)
        .patch(`${MODERATION_URL}/groups/${missingId}`)
        .set(auth(admin))
        .send({ moderationStatus: 'Hidden' });

      expect(missingResponse.status).toBe(404);
      expect(JSON.stringify(missingResponse.body)).not.toContain(
        'Moderation Test Group'
      );
    });
  });

  describe('Role-based access control', () => {
    test.each(['Student', 'Faculty'])(
      '%s cannot access moderation endpoints',
      async (role) => {
        const user = role === 'Student' ? student : faculty;

        const responses = await Promise.all([
          request(app)
            .get(`${MODERATION_URL}/groups`)
            .set(auth(user)),

          request(app)
            .patch(`${MODERATION_URL}/groups/${group.id}`)
            .set(auth(user))
            .send({ moderationStatus: 'Hidden' }),

          request(app)
            .get(`${MODERATION_URL}/materials`)
            .set(auth(user)),

          request(app)
            .patch(`${MODERATION_URL}/materials/${material.id}`)
            .set(auth(user))
            .send({ moderationStatus: 'Hidden' }),
        ]);

        for (const response of responses) {
          expect(response.status).toBe(403);
          expect(response.body.error.message).toBe('Access denied');
        }

        expect(
          (await StudyGroup.findById(group.id)).moderationStatus
        ).toBe('Active');

        expect(
          (await Material.findById(material.id)).moderationStatus
        ).toBe('Active');
      }
    );

    test('unauthenticated users cannot access moderation endpoints', async () => {
      const responses = await Promise.all([
        request(app).get(`${MODERATION_URL}/groups`),

        request(app)
          .patch(`${MODERATION_URL}/groups/${group.id}`)
          .send({ moderationStatus: 'Hidden' }),

        request(app).get(`${MODERATION_URL}/materials`),

        request(app)
          .patch(`${MODERATION_URL}/materials/${material.id}`)
          .send({ moderationStatus: 'Hidden' }),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Hidden study groups', () => {
    test('hidden groups cannot be joined or listed by members', async () => {
      await StudyGroup.findByIdAndUpdate(group.id, {
        moderationStatus: 'Hidden',
      });

      const joiner = await tokenFor('Student');

      const joinResponse = await request(app)
        .post(`${GROUPS_URL}/${group.id}/join`)
        .set(auth(joiner));

      expect(joinResponse.status).toBe(404);

      const savedGroup = await StudyGroup.findById(group.id);
      expect(savedGroup.members.map(String)).not.toContain(joiner.id);

      const listResponse = await request(app)
        .get(`${GROUPS_URL}/mine`)
        .set(auth(student));

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.groups).toHaveLength(0);
    });

    test('hidden groups are unavailable even to existing members joining again', async () => {
      await StudyGroup.findByIdAndUpdate(group.id, {
        moderationStatus: 'Hidden',
      });

      const response = await request(app)
        .post(`${GROUPS_URL}/${group.id}/join`)
        .set(auth(student));

      expect(response.status).toBe(404);
      expect(JSON.stringify(response.body)).not.toContain(
        'Moderation Test Group'
      );
    });
  });

  describe('Hidden collaborative materials', () => {
    test('hidden materials are excluded from the owner material list', async () => {
      await Material.findByIdAndUpdate(material.id, {
        moderationStatus: 'Hidden',
      });

      const response = await request(app)
        .get(`${MATERIALS_URL}/mine`)
        .set(auth(student));

      expect(response.status).toBe(200);
      expect(response.body.materials).toHaveLength(0);
    });

    test('hidden materials cannot be viewed or downloaded by the owner', async () => {
      await Material.findByIdAndUpdate(material.id, {
        moderationStatus: 'Hidden',
      });

      const detailsResponse = await request(app)
        .get(`${MATERIALS_URL}/${material.id}`)
        .set(auth(student));

      const downloadResponse = await request(app)
        .get(`${MATERIALS_URL}/${material.id}/download`)
        .set(auth(student));

      expect(detailsResponse.status).toBe(404);
      expect(downloadResponse.status).toBe(404);

      expect(detailsResponse.body.error.message).toBe(
        'Material unavailable'
      );
      expect(downloadResponse.body.error.message).toBe(
        'Material unavailable'
      );

      expect(JSON.stringify(detailsResponse.body)).not.toContain(
        'Moderation Test Material'
      );
    });

    test('hidden materials are excluded from shared material lists', async () => {
      await MaterialShare.create({
        material: material._id,
        owner: student.id,
        recipient: recipient.id,
        revokedAt: null,
      });

      await Material.findByIdAndUpdate(material.id, {
        moderationStatus: 'Hidden',
      });

      const response = await request(app)
        .get(`${MATERIALS_URL}/shared`)
        .set(auth(recipient));

      expect(response.status).toBe(200);
      expect(response.body.materials).toHaveLength(0);
    });

    test('shared recipients cannot view or download hidden materials', async () => {
      await MaterialShare.create({
        material: material._id,
        owner: student.id,
        recipient: recipient.id,
        revokedAt: null,
      });

      await Material.findByIdAndUpdate(material.id, {
        moderationStatus: 'Hidden',
      });

      const detailsResponse = await request(app)
        .get(`${MATERIALS_URL}/${material.id}`)
        .set(auth(recipient));

      const downloadResponse = await request(app)
        .get(`${MATERIALS_URL}/${material.id}/download`)
        .set(auth(recipient));

      expect(detailsResponse.status).toBe(404);
      expect(downloadResponse.status).toBe(404);

      expect(detailsResponse.body.error.message).toBe(
        'Material unavailable'
      );
      expect(downloadResponse.body.error.message).toBe(
        'Material unavailable'
      );
    });
  });
});
