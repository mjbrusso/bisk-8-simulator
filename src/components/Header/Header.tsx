import { APP_BASE_PATH } from "../../config/app";
import Toolbar from "../Toolbar/Toolbar";
import type { ToolbarAction } from "../Toolbar/Toolbar";
import styles from "./Header.module.css";

interface HeaderProps {
  openConnection: (() => Promise<void>) | null;
  connected: boolean;
  IOBegin: number;
  setIOBegin: (begin: number) => void;
  IOEnd: number;
  setIOEnd: (end: number) => void;
  toolbarActions: ToolbarAction[];
}

function Header({
  openConnection,
  connected,
  IOBegin,
  setIOBegin,
  IOEnd,
  setIOEnd,
  toolbarActions,
}: HeaderProps) {
  return (
    <header className={styles.navbar}>
      <div className={styles.brandBlock}>
        <img
          src={`${APP_BASE_PATH}bisk-8-icon.svg`}
          alt="Bisk-8 Simulator"
          className={styles.brandIcon}
        />
        <h1 className={styles.title}>BISK-8 SIMULATOR</h1>
      </div>

      <div className={styles.toolbarArea}>
        <Toolbar actions={toolbarActions} />
      </div>
    </header>
  );
}

export default Header;
