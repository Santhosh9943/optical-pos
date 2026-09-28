'use client';

import * as React from 'react';
import { Dialog } from './dialog';
import { Button } from './button';

/**
 * @description Props for {@link ConfirmDialog}.
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Called when the user cancels (Cancel button, Escape, or backdrop click). */
  onClose: () => void;
  /** Called when the user confirms; the dialog closes afterwards. */
  onConfirm: () => void;
  /** Dialog heading, phrased as a question (e.g. "Clear the entire bill?"). */
  title: React.ReactNode;
  /** Supporting text explaining the consequence of confirming. */
  description?: React.ReactNode;
  /** Visible label of the confirm button (default "Confirm"). */
  confirmLabel?: string;
  /** Visible label of the cancel button (default "Cancel"). */
  cancelLabel?: string;
  /** Renders the confirm button with the destructive variant (default `true`). */
  destructive?: boolean;
  /** Optional `data-testid` applied to the confirm button for E2E tests. */
  confirmTestId?: string;
}

/**
 * @description Accessible confirmation prompt for destructive or irreversible actions
 * (e.g. clearing a POS bill). Built on the shared {@link Dialog} primitive; focus starts on
 * the Cancel button so an accidental Enter never confirms the destructive action.
 * @param props - {@link ConfirmDialogProps}
 * @returns The confirmation dialog, or `null` when closed.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  confirmTestId,
}: ConfirmDialogProps): React.JSX.Element | null {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} autoFocus className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            data-testid={confirmTestId}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {null}
    </Dialog>
  );
}
