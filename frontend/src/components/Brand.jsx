/** Brand mark, top-left on every screen, so staff can tell they are on the right system. */
export default function Brand() {
  return (
    <header className="brand" aria-label="Health Monitoring System">
      <span className="logo" aria-hidden="true">+</span>
      <span>Health Monitoring System</span>
      <small>&middot; HealthTrack</small>
    </header>
  );
}
