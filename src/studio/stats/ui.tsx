// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Small layout pieces shared by the /stats panels.

import type { ReactNode } from 'react';

export function Panel({ id, title, question, children }: { id: string; title: string; question: string; children: ReactNode }): ReactNode {
  return (
    <section aria-labelledby={`${id}-h`} className="kcs-card flex flex-col gap-4" data-testid={`panel-${id}`}>
      <header>
        <h2 id={`${id}-h`} className="text-base font-semibold" style={{ color: 'var(--kcs-text)' }}>{title}</h2>
        <p className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{question}</p>
      </header>
      {children}
    </section>
  );
}

export function SubHead({ children }: { children: ReactNode }): ReactNode {
  return <h3 className="text-sm font-medium" style={{ color: 'var(--kcs-text-2)' }}>{children}</h3>;
}

export function Unknown({ section }: { section: string }): ReactNode {
  return (
    <p className="text-sm" style={{ color: 'var(--kcs-critical-text)' }}>
      Unknown — the {section} read failed (see Read failures).
    </p>
  );
}

export function Note({ children }: { children: ReactNode }): ReactNode {
  return <p className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{children}</p>;
}

export function Figure({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--kcs-muted)' }}>{label}</div>
      <div className="text-lg font-semibold" style={{ color: 'var(--kcs-text)' }}>{value}</div>
    </div>
  );
}
