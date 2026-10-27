import styles from './inspector.module.css';
export function EmptyControls() {
  return <div className={styles.empty}>
    <h3>Add your first dials</h3>
    <p className={styles.emptyHint}>Ask your agent in chat to add dials for the things you want to control in this view.</p>
    <p className={styles.emptyHint}>For example: “Add dials for card spacing, corner radius, and animation timing.”</p>
  </div>;
}
