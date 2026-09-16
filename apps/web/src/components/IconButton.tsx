import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconName = 'edit' | 'copy' | 'plus' | 'close' | 'lock' | 'link' | 'check' | 'unlink' | 'trash' | 'map' | 'eye' | 'eye-off';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  children?: ReactNode;
};

function Icon({ icon }: { icon: IconName }) {
  if (icon === 'edit') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19h3.4L18.7 8.7l-3.4-3.4L5 15.6V19Z" />
        <path d="m14.2 6.4 1.1-1.1a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8l-1.1 1.1" />
      </svg>
    );
  }

  if (icon === 'copy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (icon === 'plus') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (icon === 'lock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      </svg>
    );
  }

  if (icon === 'link') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1" />
      </svg>
    );
  }

  if (icon === 'unlink') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 7h1a5 5 0 0 1 3.5 8.5l-2 2A5 5 0 0 1 10 17" />
        <path d="M9 17H8a5 5 0 0 1-3.5-8.5l2-2A5 5 0 0 1 14 7" />
        <path d="M4 4l16 16" />
      </svg>
    );
  }

  if (icon === 'check') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (icon === 'trash') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </svg>
    );
  }

  if (icon === 'map') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
        <path d="M9 3v15" />
        <path d="M15 6v15" />
      </svg>
    );
  }

  if (icon === 'eye') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  if (icon === 'eye-off') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a3 3 0 0 0 3.8 3.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.1 4.2" />
        <path d="M6.6 6.9C3.7 8.8 2 12 2 12s3.5 7 10 7a10.5 10.5 0 0 0 4.1-.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function IconButton({ icon, label, children, className = '', title, ...props }: IconButtonProps) {
  return (
    <button className={`icon-button ${className}`.trim()} aria-label={label} title={title || label} type="button" {...props}>
      <Icon icon={icon} />
      {children && <span>{children}</span>}
    </button>
  );
}
