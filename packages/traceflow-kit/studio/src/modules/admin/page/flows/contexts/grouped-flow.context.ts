import { createContext } from 'react';
import type { GroupedFlowActions } from '../interfaces/grouped-flow.interface';

export const GroupedFlowContext = createContext<GroupedFlowActions>({ selectSpan: () => undefined, toggleGroup: () => undefined });
