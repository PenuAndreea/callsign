import '@testing-library/jest-dom/vitest';
import { setupApiTestServer } from '@callsign/hooks/testing';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

setupApiTestServer();

afterEach(() => {
  cleanup();
});
