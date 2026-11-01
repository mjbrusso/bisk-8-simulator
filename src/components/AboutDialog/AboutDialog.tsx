import { useEffect, useRef } from "react";
import { APP_BASE_PATH, APP_NAME, APP_REPOSITORY, APP_VERSION } from "../../config/app";
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
        <div className={styles.appHeader}>
          <img src={`${APP_BASE_PATH}bisk-8-icon.svg`} alt="Bisk-8 Simulator" className={styles.appIcon} />
          <p className={styles.metaStrong}>{APP_NAME}</p>
        </div>

        <p className={styles.meta}>
          Projeto criado como TCC do curso de <a href="https://www.upf.br/itec/curso/engenharia-de-computacao" target="_blank" rel="noreferrer">Engenharia de Computação</a> da <a href="https://www.upf.br/" target="_blank" rel="noreferrer">Universidade de Passo Fundo (UPF)</a>, pelo acadêmico <a href="https://github.com/lfachinetto/" target="_blank" rel="noreferrer">Lucas Fachinetto</a>, orientado pelo prof. <a href="https://github.com/mjbrusso/" target="_blank" rel="noreferrer">Marcos José Brusso</a>.
        </p>

        <p className={styles.meta}>Versão: {APP_VERSION}</p>

        <p className={styles.meta}>
          Fontes: <a href={`https://${APP_REPOSITORY}`} target="_blank" rel="noreferrer">{APP_REPOSITORY}</a>
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
