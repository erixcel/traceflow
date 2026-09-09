import type { TraceFlowSpanDto } from 'traceflow/protocol';
import type { JsonValue } from '../types/json.type';

export interface DetailsPanelProps {
  span: TraceFlowSpanDto;
  onClose: () => void;
  initialTab?: 'input' | 'output';
}

export interface DetailItemProps {
  label: string;
  value: string;
}

export interface SectionTitleProps {
  children: string;
}

export interface TraceDataSectionProps {
  title: string;
  value: JsonValue | undefined;
  emptyMessage: string;
}

export interface IdRowProps {
  label: string;
  value: string;
  display: string;
  copied: string | null;
  onCopy: (label: string, value: string) => Promise<void>;
}
