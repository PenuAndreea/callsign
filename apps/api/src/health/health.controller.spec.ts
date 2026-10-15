import { ServiceUnavailableException } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ConnectionStates } from 'mongoose';

import { HealthController } from './health.controller';

async function createController(readyState: ConnectionStates): Promise<HealthController> {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: getConnectionToken(), useValue: { readyState } }],
  }).compile();
  return moduleRef.get(HealthController);
}

describe('HealthController', () => {
  describe('check', () => {
    it('returns { status: "ok" } while the database is connected', async () => {
      const controller = await createController(ConnectionStates.connected);
      expect(controller.check()).toEqual({ status: 'ok' });
    });

    it('throws 503 while the database is not connected', async () => {
      const controller = await createController(ConnectionStates.disconnected);
      expect(() => controller.check()).toThrow(ServiceUnavailableException);
    });
  });
});
