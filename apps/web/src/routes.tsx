import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';

import { AppBoundary } from './routes/AppBoundary';
import { RegisterRoute, SignInRoute } from './routes/authRoutes';
import { GuestOnly } from './routes/GuestOnly';
import { NetsLayout, NoNetSelected } from './routes/NetsLayout';
import { ChatRoute, NewNetRoute } from './routes/netsRoutes';
import { RequireAuth } from './routes/RequireAuth';
import { SessionGate } from './routes/SessionGate';

/**
 * Every route waits for the session (`SessionGate`), then splits into guest and signed-in pages.
 * A crash anywhere below shows the crash screen (`AppBoundary`); the chat panel has its own.
 */
export const routes: RouteObject[] = [
  {
    element: (
      <AppBoundary>
        <SessionGate />
      </AppBoundary>
    ),
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/signin', element: <SignInRoute /> },
          { path: '/register', element: <RegisterRoute /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <NetsLayout />,
            children: [
              { path: '/', element: <NoNetSelected /> },
              { path: '/nets/new', element: <NewNetRoute /> },
              { path: '/nets/:netId', element: <ChatRoute /> },
            ],
          },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
