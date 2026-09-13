import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Modal } from './Modal';

function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open details</button>
      {open && (
        <Modal title="Listing details" onClose={() => setOpen(false)}>
          <button type="button">Confirm action</button>
        </Modal>
      )}
    </>
  );
}

describe('Modal', () => {
  it('moves focus inside, traps keyboard focus, and restores the opener', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Open details' });

    await user.click(opener);

    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    const confirmButton = screen.getByRole('button', { name: 'Confirm action' });
    expect(closeButton).toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Listing details');

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.click(closeButton);
    expect(opener).toHaveFocus();
  });
});
