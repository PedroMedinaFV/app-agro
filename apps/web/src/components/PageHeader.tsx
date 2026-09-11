import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, aside }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="hint">{description}</p>}
      </div>
      {(actions || aside) && (
        <div className="page-header-actions">
          {aside}
          {actions}
        </div>
      )}
    </section>
  );
}
