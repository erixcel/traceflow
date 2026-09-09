import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { routes } from './routes';

export function App(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="grid h-full place-items-center bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-950">Cargando módulo…</div>}>
      <RouterProvider router={routes} />
    </Suspense>
  );
}
