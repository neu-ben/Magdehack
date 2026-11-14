// Wasser links und rechts neben der App-Spalte: drei Wellenschichten, die an der Spalte entlangströmen
// (links nach unten, rechts nach oben – das Wasser fließt um den Screen herum). Rein dekorativ.

function Seite({ seite }: { seite: "links" | "rechts" }) {
  return (
    <div className={`wellen-seite ${seite}`}>
      {["w1", "w2", "w3"].map((w) => (
        <div key={w} className={`welle ${w}`}>
          <div className="wasser" />
          <div className="kante" />
        </div>
      ))}
    </div>
  );
}

export function WellenRahmen() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden min-[600px]:block">
      <Seite seite="links" />
      <Seite seite="rechts" />
    </div>
  );
}
