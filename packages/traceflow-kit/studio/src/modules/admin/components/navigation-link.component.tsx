import { NavLink } from 'react-router-dom';
import type { NavigationLinkProps } from '../interfaces/navigation-link.interface';

export function NavigationLinkComponent({ to, label, icon }: NavigationLinkProps): React.JSX.Element {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex w-[3.75rem] flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-semibold transition ${
          isActive
            ? 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200'
        }`
      }
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}
