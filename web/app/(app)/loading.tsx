export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="placeholder-glow">
      <span className="placeholder col-4" />
      <span className="placeholder col-7 d-block mt-3" />
      <span className="placeholder col-12 d-block mt-4" style={{ height: "12rem" }} />
    </div>
  );
}
