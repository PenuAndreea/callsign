import type { RouteObject } from 'react-router';
import { Navigate } from 'react-router';

import { RegisterRoute, SignInRoute } from './routes/authRoutes';
import { GuestOnly } from './routes/GuestOnly';
import { HomeRoute } from './routes/HomeRoute';
import { RequireAuth } from './routes/RequireAuth';
import { SessionGate } from './routes/SessionGate';

/** Every route waits for the session (`SessionGate`), then splits into guest and signed-in pages. */
export const routes: RouteObject[] = [
  {
    element: <SessionGate />,
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
        children: [{ path: '/', element: <HomeRoute /> }],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
