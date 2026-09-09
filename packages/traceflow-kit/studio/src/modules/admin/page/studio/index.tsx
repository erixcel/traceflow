import { useEffect } from 'react';
import { useHeaderStore } from '../../stores/header.store';
import { StudioPlaceholderLayout } from './layout/studio-placeholder.layout';

export function StudioPage(): React.JSX.Element {
  const setHeader = useHeaderStore((state) => state.setHeader);

  useEffect(() => {
    setHeader({ eyebrow: 'TraceFlow', title: 'Studio', summary: null });
  }, [setHeader]);

  return <StudioPlaceholderLayout />;
}
