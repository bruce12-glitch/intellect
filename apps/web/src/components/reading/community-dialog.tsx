'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function CommunityDialog({ title, close, children, wide = false }: { title: string; close: () => void; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = 'community-dialog-title';
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className={`reading-dialog research-dialog ${wide ? 'dialog-wide' : ''}`} aria-labelledby={headingId} onCancel={close} onClick={event => { if (event.target === dialog.current) close(); }}>
    <div className="dialog-heading"><span className="eyebrow">INTELLECT · V0.2</span><button className="icon-button" onClick={close} aria-label="Close community dialog"><X size={20} /></button></div>
    <h2 id={headingId}>{title}</h2>{children}
  </dialog>;
}
