import type { ReactNode } from 'react';

type ActionBarProps = {
  children: ReactNode;
  compact?: boolean;
  align?: 'start' | 'end';
};

export function ActionBar({ children, compact, align = 'start' }: ActionBarProps) {
  return (
    <div className={`action-bar ${compact ? 'compact' : ''} ${align === 'end' ? 'align-end' : ''}`.trim()}>
      {children}
    </div>
  );
}
