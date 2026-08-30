import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('UsersController - Rate Limiting (Integração)', () => {
  let app: INestApplication;
  const mockUsersService = {
    create: jest.fn().mockResolvedValue({
      id: 'new-user-uuid',
      name: 'Novo Usuário',
      email: 'novo.usuario@email.com',
      createdAt: new Date(),
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 60,
          },
        ]),
      ],
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve permitir ate 5 criacoes de usuarios consecutivas e bloquear a 6ª com 429 Too Many Requests', async () => {
    const createUserPayload = {
      name: 'Novo Usuário',
      email: 'novo.usuario@email.com',
      password: 'senhaForte123',
    };

    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserPayload);
      expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    const blockedResponse = await request(app.getHttpServer())
      .post('/users')
      .send(createUserPayload);

    expect(blockedResponse.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(blockedResponse.body.message).toContain('ThrottlerException');
  });
});
