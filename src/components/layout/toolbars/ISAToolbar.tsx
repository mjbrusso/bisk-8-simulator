import styles from "./Toolbar.module.css";

interface ISAToolbarProps {
    about: () => void;
}

function ISAToolbar({
  about,
}: ISAToolbarProps) {
  return (
    <header>
      <div className={styles.leftActions}></div>
      <div className={styles.rightActions}>
        <button className={styles.button} onClick={about} title="Sobre">
          <span className="material-symbols-outlined">info</span>
        </button>
      </div>
    </header>
  );
}

export default ISAToolbar;
