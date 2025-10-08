import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AvailabilityController (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let createdId: number;
  let residenceId = 1; // À adapter selon vos seeds

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/availabilities (POST) crée une disponibilité', async () => {
    const res = await request
      .default(server)
      .post('/availabilities')
      .send({
        residenceId,
        startDate: new Date(Date.now() + 86400000).toISOString(),
        endDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      .expect(201);
    expect(res.body.data).toHaveProperty('id');
    createdId = res.body.data.id;
  });

  it('/availabilities/:id (PATCH) modifie une disponibilité', async () => {
    const res = await request
      .default(server)
      .patch(`/availabilities/${createdId}`)
      .send({ endDate: new Date(Date.now() + 3 * 86400000).toISOString() })
      .expect(200);
    expect(res.body.data.endDate).toBeDefined();
  });

  it('/availabilities/residence/:residenceId (GET) liste les disponibilités', async () => {
    const res = await request
      .default(server)
      .get(`/availabilities/residence/${residenceId}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('/availabilities/:id (DELETE) supprime une disponibilité', async () => {
    await request
      .default(server)
      .delete(`/availabilities/${createdId}`)
      .expect(200);
  });
});
