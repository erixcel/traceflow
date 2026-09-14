import { createContext } from 'react';
import type { GroupedFlowActions } from '../interfaces/grouped-flow.interface';

export const GroupedFlowContext = createContext<GroupedFlowActions>({
  selectSpan: () => undefined,
  selectCard: () => undefined,
  toggleGroup: () => undefined,
  openStep: () => undefined,
  closeDetail: () => undefined,
  fit: () => undefined,
});
