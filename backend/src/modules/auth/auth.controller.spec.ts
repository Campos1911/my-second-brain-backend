import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('AuthController - Rate Limiting (Integração)', () => {
  let app: INestApplication;

  // Mock simplificado do serviço de autenticação para isolar o teste do banco de dados
  const mockAuthService = {
    login: jest.fn().mockResolvedValue({
      access_token: 'mock-jwt-token',
      user: { id: 'user-uuid', email: 'demo@secondbrain.com' },
    }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        // Inicializa o Throttler com o mesmo comportamento do AppModule
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 60,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

  it('deve permitir ate 5 tentativas de login consecutivas e bloquear a 6ª com 429 Too Many Requests', async () => {
    const loginPayload = {
      email: 'demo@secondbrain.com',
      password: 'senhaSegura123',
    };

    // Realiza as primeiras 5 requisições rápidas (dentro do limite configurado)
    for (let i = 0; i < 5; i++) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginPayload);

      expect(response.status).not.toBe(HttpStatus.TOO_MANY_REQUESTS);
    }

    // A 6ª requisição imediata deve falhar com Too Many Requests (429)
    const blockedResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(loginPayload);

    expect(blockedResponse.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(blockedResponse.body.message).toContain('ThrottlerException');
  });
});
