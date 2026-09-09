import { NavigationLinkComponent } from '../components/navigation-link.component';
import { ThemeMenuComponent } from '../components/theme-menu.component';

export function SidebarLayout(): React.JSX.Element {
  return (
    <aside className="col-start-1 row-span-2 row-start-1 flex min-h-0 flex-col items-center border-r border-zinc-200 bg-white py-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid size-10 place-items-center rounded-xl border border-pink-400/50 bg-gradient-to-br from-pink-500 to-pink-800 text-xs font-extrabold tracking-tight text-white shadow-lg shadow-pink-500/20">
        TF
      </div>
      <nav className="mt-8 flex w-full flex-col items-center gap-2" aria-label="Navegación principal">
        <NavigationLinkComponent to="/admin/flows" label="Flows" icon="⌁" />
        <NavigationLinkComponent to="/admin/studio" label="Studio" icon="◇" />
        <NavigationLinkComponent to="/admin/docs" label="Docs" icon="?" />
      </nav>
      <div className="mt-auto">
        <ThemeMenuComponent />
      </div>
      <span className="mt-4 text-[8px] font-bold tracking-[0.16em] text-zinc-400 uppercase [writing-mode:vertical-rl] dark:text-zinc-600">TraceFlow</span>
    </aside>
  );
}
