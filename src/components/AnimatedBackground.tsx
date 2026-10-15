import styles from "./AnimatedBackground.module.css";

export default function AnimatedBackground({ enabled = true }: { enabled?: boolean }) {
  // Les couches CSS évitent le deuxième moteur et shader plein écran.
  return <div aria-hidden="true" data-animated={enabled} className={styles.base}>
    <div className={styles.gradient} /><div className={styles.light} /><div className={styles.shade} />
  </div>;
}
