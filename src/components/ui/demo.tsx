import { useState } from "react";
import { Button } from "./button-1";
import { Modal } from "./modal";

export default function InsetDemo() {
  const [open5, setOpen5] = useState(false);
  return (
        <div>
          <Button onClick={() => setOpen5(true)} size="small">
            Open Modal
          </Button>

          <Modal.Modal active={open5} onClickOutside={() => setOpen5(false)}>
            <Modal.Body>
              <Modal.Header>
                <Modal.Title>Modal</Modal.Title>
                <Modal.Subtitle>This is a modal.</Modal.Subtitle>
              </Modal.Header>

              <Modal.Inset>
                <div className="font-sans text-sm text-[#171717] dark:text-[#ededed]">Content within the inset.</div>
              </Modal.Inset>

              <div className="pt-6">
                <div className="font-sans text-sm text-[#171717] dark:text-[#ededed]">Content outside the inset.</div>
              </div>
            </Modal.Body>

            <Modal.Actions>
              <Modal.Action onClick={() => setOpen5(false)} type="secondary">
                Cancel
              </Modal.Action>

              <Modal.Action onClick={() => setOpen5(false)}>Submit</Modal.Action>
            </Modal.Actions>
          </Modal.Modal>
        </div>
  );
}
