import { Outlet } from 'react-router-dom';
import { useTheme } from './hooks/theme.hook';
import { NavbarLayout } from './layout/navbar.layout';
import { SidebarLayout } from './layout/sidebar.layout';

export function AdminModule(): React.JSX.Element {
  useTheme();

  return (
    <div className="grid h-dvh min-h-0 grid-cols-[4.75rem_minmax(0,1fr)] grid-rows-[4.5rem_minmax(0,1fr)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <SidebarLayout />
      <NavbarLayout />
      <main className="relative col-start-2 row-start-2 min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
