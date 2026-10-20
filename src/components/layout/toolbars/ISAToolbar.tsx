import styles from "./Toolbar.module.css";

interface ISAToolbarProps {
    about: () => void;
    darkMode: boolean;
    toggleTheme: () => void;
}

function ISAToolbar({
  about,
  darkMode,
  toggleTheme,
}: ISAToolbarProps) {
  return (
    <menu>
      <div className={styles.leftActions}></div>
      <div className={styles.rightActions}>
        <button
          className={styles.button}
          onClick={toggleTheme}
          title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          aria-pressed={darkMode}
        >
          <span className="material-symbols-outlined">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>
        <button className={styles.button} onClick={about} title="Sobre">
          <span className="material-symbols-outlined">info</span>
        </button>
      </div>
    </menu>
  );
}

export default ISAToolbar;
