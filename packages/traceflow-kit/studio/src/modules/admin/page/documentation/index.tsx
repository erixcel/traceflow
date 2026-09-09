import { useEffect } from 'react';
import { useHeaderStore } from '../../stores/header.store';
import { DocumentationLayout } from './layout/documentation.layout';

export function DocumentationPage(): React.JSX.Element {
  const setHeader = useHeaderStore((state) => state.setHeader);

  useEffect(() => {
    setHeader({ eyebrow: 'Guía de uso', title: 'Documentación visual', summary: null });
  }, [setHeader]);

  return <DocumentationLayout />;
}
