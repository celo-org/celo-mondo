import { PropsWithChildren } from 'react';

export function useModal(id: string) {
  return () => {
    const dialog = document.getElementById(id) as HTMLDialogElement;
    dialog?.showModal();
  };
}

export function Modal({
  id,
  className,
  children,
}: PropsWithChildren<{ id: string; className?: string }>) {
  return (
    <dialog id={id} className="modal modal-bottom sm:modal-middle">
      <div className={`modal-box ${className}`}>
        <form method="dialog">
          <button className="btn btn-circle btn-ghost btn-sm absolute right-2 top-2 outline-none">
            ✕
          </button>
        </form>
        {children}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
