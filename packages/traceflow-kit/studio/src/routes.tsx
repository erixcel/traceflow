import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AdminModule } from './modules/admin';

const FlowsPage = lazy(() => import('./modules/admin/page/flows').then((module) => ({ default: module.FlowsPage })));
const StudioPage = lazy(() => import('./modules/admin/page/studio').then((module) => ({ default: module.StudioPage })));
const DocumentationPage = lazy(() => import('./modules/admin/page/documentation').then((module) => ({ default: module.DocumentationPage })));

export const routes = createBrowserRouter([
  { path: '/', element: <Navigate to="/admin/flows" replace /> },
  {
    path: '/admin',
    element: <AdminModule />,
    children: [
      { index: true, element: <Navigate to="flows" replace /> },
      { path: 'flows', element: <FlowsPage /> },
      { path: 'studio', element: <StudioPage /> },
      { path: 'docs', element: <DocumentationPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/admin/flows" replace /> },
]);
