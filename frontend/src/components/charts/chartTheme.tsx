import type { TooltipProps } from 'recharts';
import { formatNumber } from '../../utils/format';

/** Central palette so every chart uses identical colors. */
export const CHART_COLORS = {
  primary: '#22d3ee',
  primaryDim: 'rgba(34, 211, 238, 0.35)',
  grid: '#243044',
  axis: '#5d6b80',
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#34d399',
  neutral: '#94a3b8',
  negative: '#f87171',
};

export const SENTIMENT_FILL = (sentiment: string) =>
  SENTIMENT_COLORS[sentiment] ?? SENTIMENT_COLORS.neutral;

const tooltipStyle: React.CSSProperties = {
  background: '#1a2333',
  border: '1px solid #243044',
  borderRadius: 8,
  fontSize: 12,
  color: '#e8edf5',
};

/** Compact dark tooltip shared by all charts. */
export function DarkTooltip({
  active,
  payload,
  label,
  formatter,
}: TooltipProps<number, string> & { formatter?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      {label !== undefined && <div style={{ marginBottom: 4 }}>{label}</div>}
      {payload.map((entry) => (
        <div key={entry.dataKey as string}>
          {entry.name}: {formatter ? formatter(entry.value as number) : formatNumber(entry.value as number)}
        </div>
      ))}
    </div>
  );
}
