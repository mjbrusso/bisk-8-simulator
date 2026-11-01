import type { ReactNode } from "react";
import styles from "./Toolbar.module.css";

export type ToolbarAlignment = "left" | "right";

export interface ToolbarAction {
  id: string;
  align: ToolbarAlignment;
  element: ReactNode;
}

interface ToolbarProps {
  actions: ToolbarAction[];
}

function Toolbar({ actions }: ToolbarProps) {
  const leftActions = actions.filter((action) => action.align === "left");
  const rightActions = actions.filter((action) => action.align === "right");

  return (
    <menu className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        {leftActions.map((action) => (
          <div key={action.id}>{action.element}</div>
        ))}
      </div>
      <div className={`${styles.toolbarGroup} ${styles.toolbarGroupRight}`}>
        {rightActions.map((action) => (
          <div key={action.id}>{action.element}</div>
        ))}
      </div>
    </menu>
  );
}

export default Toolbar;
