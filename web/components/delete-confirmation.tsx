"use client";

import { useEffect, useRef, useState } from "react";

type DeleteConfirmationProps = {
  itemLabel: string;
  onConfirm: () => void | Promise<void>;
};

export function DeleteConfirmation({ itemLabel, onConfirm }: DeleteConfirmationProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
    else triggerRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function confirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className="btn btn-sm btn-outline-danger" onClick={() => setOpen(true)} ref={triggerRef} type="button">Excluir</button>
      {open ? (
        <div aria-labelledby="delete-dialog-title" aria-modal="true" className="modal d-block" role="dialog">
          <button aria-label="Fechar confirmação" className="modal-backdrop border-0" onClick={() => setOpen(false)} type="button" />
          <div className="modal-dialog modal-dialog-centered" ref={dialogRef}>
            <div className="modal-content position-relative">
              <div className="modal-header">
                <h2 className="modal-title fs-5" id="delete-dialog-title">Confirmar exclusão</h2>
                <button aria-label="Fechar confirmação" className="btn-close" onClick={() => setOpen(false)} type="button" />
              </div>
              <div className="modal-body"><p className="mb-0">Excluir {itemLabel}? Essa ação não pode ser desfeita.</p></div>
              <div className="modal-footer">
                <button className="btn btn-secondary" disabled={pending} onClick={() => setOpen(false)} ref={cancelRef} type="button">Cancelar</button>
                <button className="btn btn-danger" disabled={pending} onClick={() => void confirm()} type="button">{pending ? "Excluindo..." : "Excluir"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
