// Otti, der Otter. Eigene Illustration. Seeotter halten sich beim Schlafen an den Pfoten,
// damit keiner wegtreibt – wie eine gute Übergabe: niemand geht verloren.

export type OttiStimmung = "neutral" | "freude" | "hoert" | "denkt" | "sorge";

export function Otti({
  stimmung = "neutral",
  groesse = 160,
  wippen = false,
  className = "",
}: {
  stimmung?: OttiStimmung;
  groesse?: number;
  wippen?: boolean;
  className?: string;
}) {
  const blickY = stimmung === "denkt" ? -4 : 0;
  const blickX = stimmung === "denkt" ? 3 : 0;

  return (
    <svg
      viewBox="0 0 200 200"
      width={groesse}
      height={groesse}
      className={`${wippen ? "anim-wippen" : ""} ${className}`}
      role="img"
      aria-label={`Otti der Otter (${stimmung})`}
    >
      {/* Schatten */}
      <ellipse cx="100" cy="188" rx="52" ry="7" fill="#000" opacity="0.07" />

      {/* Schwanz */}
      <path d="M140 172 C 178 170, 186 140, 170 128 C 168 150, 154 160, 136 160 Z" fill="var(--color-fell-dunkel)" />

      {/* Körper */}
      <path d="M52 130 C 52 98, 148 98, 148 130 L 150 168 C 150 186, 50 186, 50 168 Z" fill="var(--color-fell)" />
      <ellipse cx="100" cy="150" rx="32" ry="28" fill="var(--color-creme)" />

      {/* Ohren */}
      <circle cx="50" cy="44" r="15" fill="var(--color-fell)" />
      <circle cx="50" cy="44" r="7" fill="var(--color-fell-dunkel)" />
      <circle cx="150" cy="44" r="15" fill="var(--color-fell)" />
      <circle cx="150" cy="44" r="7" fill="var(--color-fell-dunkel)" />

      {/* Kopf */}
      <ellipse cx="100" cy="80" rx="64" ry="58" fill="var(--color-fell)" />

      {/* Pflegehaube mit Kreuz */}
      <path d="M72 30 C 76 14, 124 14, 128 30 L 124 36 C 112 32, 88 32, 76 36 Z" fill="white" stroke="var(--color-linie)" strokeWidth="2" />
      <rect x="96" y="19" width="8" height="14" rx="2" fill="var(--color-koralle)" />
      <rect x="93" y="22" width="14" height="8" rx="2" fill="var(--color-koralle)" />

      {/* Helles Gesicht */}
      <path d="M48 92 C 48 70, 76 64, 100 72 C 124 64, 152 70, 152 92 C 152 122, 126 134, 100 134 C 74 134, 48 122, 48 92 Z" fill="var(--color-creme)" />

      {/* Augenbrauen bei Sorge */}
      {stimmung === "sorge" && (
        <>
          <path d="M64 64 L 84 57" stroke="var(--color-fell-dunkel)" strokeWidth="5" strokeLinecap="round" />
          <path d="M136 64 L 116 57" stroke="var(--color-fell-dunkel)" strokeWidth="5" strokeLinecap="round" />
        </>
      )}

      {/* Augen */}
      {stimmung === "freude" ? (
        <>
          <path d="M64 82 Q 76 68 88 82" stroke="var(--color-tinte)" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M112 82 Q 124 68 136 82" stroke="var(--color-tinte)" strokeWidth="6" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="76" cy="80" r="15" fill="white" />
          <circle cx="124" cy="80" r="15" fill="white" />
          <circle cx={78 + blickX} cy={81 + blickY} r="9.5" fill="var(--color-tinte)" />
          <circle cx={126 + blickX} cy={81 + blickY} r="9.5" fill="var(--color-tinte)" />
          <circle cx={81 + blickX} cy={77 + blickY} r="3.2" fill="white" />
          <circle cx={129 + blickX} cy={77 + blickY} r="3.2" fill="white" />
        </>
      )}

      {/* Bäckchen */}
      <ellipse cx="62" cy="104" rx="9" ry="6" fill="var(--color-koralle)" opacity="0.35" />
      <ellipse cx="138" cy="104" rx="9" ry="6" fill="var(--color-koralle)" opacity="0.35" />

      {/* Schnauze */}
      <ellipse cx="88" cy="110" rx="14" ry="10" fill="white" opacity="0.7" />
      <ellipse cx="112" cy="110" rx="14" ry="10" fill="white" opacity="0.7" />
      <path d="M90 98 C 90 92, 110 92, 110 98 C 110 104, 104 107, 100 107 C 96 107, 90 104, 90 98 Z" fill="var(--color-tinte)" />
      <ellipse cx="96" cy="97" rx="3" ry="1.8" fill="white" opacity="0.6" />

      {/* Mund */}
      {stimmung === "freude" && <path d="M90 114 Q 100 128 110 114 Z" fill="var(--color-koralle-dunkel)" />}
      {stimmung === "neutral" && <path d="M92 114 Q 96 119 100 114 Q 104 119 108 114" stroke="var(--color-tinte)" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {stimmung === "hoert" && <ellipse cx="100" cy="117" rx="4.5" ry="5" fill="var(--color-koralle-dunkel)" />}
      {stimmung === "denkt" && <path d="M94 117 L 106 115" stroke="var(--color-tinte)" strokeWidth="3" strokeLinecap="round" />}
      {stimmung === "sorge" && <path d="M92 119 Q 100 112 108 119" stroke="var(--color-tinte)" strokeWidth="3" fill="none" strokeLinecap="round" />}

      {/* Schnurrhaare */}
      <g stroke="var(--color-fell-dunkel)" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <path d="M74 108 L 52 104" />
        <path d="M74 113 L 54 116" />
        <path d="M126 108 L 148 104" />
        <path d="M126 113 L 146 116" />
      </g>

      {/* Pfoten, die sich halten */}
      <ellipse cx="88" cy="140" rx="13" ry="10" fill="var(--color-fell-dunkel)" />
      <ellipse cx="112" cy="140" rx="13" ry="10" fill="var(--color-fell-dunkel)" />

      {/* Schallwellen beim Zuhören */}
      {stimmung === "hoert" && (
        <g stroke="var(--color-tuerkis)" strokeWidth="4" fill="none" strokeLinecap="round">
          <path d="M170 34 Q 180 44 170 54" />
          <path d="M180 26 Q 196 44 180 62" opacity="0.6" />
        </g>
      )}

      {/* Denkblasen */}
      {stimmung === "denkt" && (
        <g fill="var(--color-tuerkis-hell)" stroke="var(--color-tuerkis)" strokeWidth="2">
          <circle cx="164" cy="30" r="5" />
          <circle cx="178" cy="16" r="8" />
        </g>
      )}
    </svg>
  );
}
