import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import type { Env } from './config/env.schema';

/**
 * App-level HTTP setup that lives outside the module graph. Shared by `main.ts` and the
 * e2e tests (`Test.createTestingModule` never runs `main.ts`), so tests hit the same app.
 * Guards, filters and pipes are registered in `AppModule` instead, through DI.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix('api');
  // Security headers (nosniff, HSTS, frame denial, ...). The API serves JSON only, so the defaults fit.
  app.use(helmet());
  // Reads the web refresh-token cookie into `req.cookies`.
  app.use(cookieParser());
  // Only the web app's origin may call the API from a browser, with cookies. Native apps are not subject to CORS.
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true });
  // Behind a reverse proxy in production, also `app.set('trust proxy', 1)` (Express app),
  // or every client shares the proxy's IP for rate limiting.
}
