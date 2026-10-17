import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

/** Largest message the server accepts: a 1000-character message is at most ~4 KB of UTF-8. */
const MAX_PAYLOAD_BYTES = 16 * 1024;

/**
 * Socket.IO server setup that needs runtime config (gateway decorators only take static
 * options). Registered in `configureApp`, so the e2e tests run the same server.
 */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly webOrigin: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: Partial<ServerOptions>): Server {
    const overrides: Partial<ServerOptions> = {
      // Same rule as the REST API: only the web app's origin, with credentials.
      cors: { origin: this.webOrigin, credentials: true },
      // The apps bundle socket.io-client; don't serve it from /socket.io/socket.io.js.
      serveClient: false,
      // Default is 1 MB; anything near that is abuse, not a chat message.
      maxHttpBufferSize: MAX_PAYLOAD_BYTES,
    };
    // `ServerOptions` lists every option as required, but Socket.IO fills in defaults for
    // anything missing (Nest itself passes partial options here).
    return super.createIOServer(port, { ...options, ...overrides } as ServerOptions);
  }
}
