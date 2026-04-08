import { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  titleAccent?: string;
  lead?: string;
  actions?: ReactNode;
}

export const PageHeader = ({ 
  eyebrow, 
  title, 
  titleAccent, 
  lead, 
  actions 
}: PageHeaderProps) => (
  <div className="mb-10 flex justify-between items-end gap-8">
    <div className="flex-1">
      {eyebrow && (
        <div
          className="text-[11px] uppercase tracking-[0.22em] text-crimson-500 font-medium mb-3"
        >
          — {eyebrow}
        </div>
      )}
      <h1
        className="font-serif text-5xl font-light text-ink-900 leading-[0.95] tracking-tight"
        style={{ letterSpacing: '-0.025em' }}
      >
        {title}
        {titleAccent && (
          <em className="italic text-crimson-500 font-normal"> {titleAccent}</em>
        )}
      </h1>
      {lead && (
        <p className="font-serif italic text-lg text-ink-500 leading-relaxed font-light mt-3">
          {lead}
        </p>
      )}
    </div>
    {actions && (
      <div className="flex gap-3 shrink-0">
        {actions}
      </div>
    )}
  </div>
);
