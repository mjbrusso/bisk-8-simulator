import { useEffect, useRef } from "react";
import { APP_NAME, APP_REPOSITORY, APP_VERSION } from "../../config/app";
import styles from "./AboutDialog.module.css";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

function AboutDialog({ open, onClose }: AboutDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal !== "function") return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>Sobre</h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Fechar informações sobre"
        >
          ×
        </button>
      </div>

      <div className={styles.content}>
        <p className={styles.metaStrong}>{APP_NAME}</p>
        <p className={styles.meta}>Versão {APP_VERSION}</p>
        <p className={styles.meta}>
          <a href={`https://${APP_REPOSITORY}`} target="_blank" rel="noreferrer">
            {APP_REPOSITORY}
          </a>
        </p>
        <p className={styles.meta}>Criador do projeto:
          <a href="https://github.com/lfachinetto/" target="_blank" rel="noreferrer">
            lfachinetto
          </a>
        </p>
        <p className={styles.meta}>Dev e mantenedor:
          <a href="https://github.com/mjbrusso/" target="_blank" rel="noreferrer">
            mjbrusso
          </a>
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default AboutDialog;
