import type { ReactNode } from 'react';

type PanelProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, actions, children, className = '' }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()}>
      {(title || description || actions) && (
        <div className="panel-header">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p className="hint">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
