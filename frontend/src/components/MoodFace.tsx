/**
 * Soft Attune-colored mood faces (1–5).
 * Round head + simple features; cooler blue when low, greener when high.
 */

const FACE_THEME: Record<
  1 | 2 | 3 | 4 | 5,
  { head: string; feature: string }
> = {
  1: { head: "#c9dff0", feature: "#2f7fa8" },
  2: { head: "#c5e4ea", feature: "#3a8f96" },
  3: { head: "#c5e6dc", feature: "#1f7a66" },
  4: { head: "#b5e3d2", feature: "#1a6f5c" },
  5: { head: "#a6decc", feature: "#145a4b" },
};

export function MoodFace({
  level,
  size = 28,
}: {
  level: number;
  size?: number;
}) {
  const clamped = Math.min(5, Math.max(1, Math.round(level))) as 1 | 2 | 3 | 4 | 5;
  const theme = FACE_THEME[clamped];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="mood-face"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill={theme.head} />
      <g fill={theme.feature} stroke={theme.feature}>
        {clamped === 1 && <FaceSad />}
        {clamped === 2 && <FaceLow />}
        {clamped === 3 && <FaceNeutral />}
        {clamped === 4 && <FaceHappy />}
        {clamped === 5 && <FaceBeaming />}
      </g>
    </svg>
  );
}

function PillEyes() {
  return (
    <>
      <rect x="7" y="8" width="2.8" height="4.6" rx="1.4" stroke="none" />
      <rect x="14.2" y="8" width="2.8" height="4.6" rx="1.4" stroke="none" />
    </>
  );
}

function FaceSad() {
  return (
    <>
      <PillEyes />
      <path
        d="M8 17.2c1.4-2 6.6-2 8 0"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
}

function FaceLow() {
  return (
    <>
      <rect x="6.2" y="9.4" width="4.4" height="2.2" rx="1.1" stroke="none" />
      <rect x="13.4" y="9.4" width="4.4" height="2.2" rx="1.1" stroke="none" />
      <path
        d="M8.2 16.6c1.2-1.2 6.4-1.2 7.6 0"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
}

function FaceNeutral() {
  return (
    <>
      <PillEyes />
      <path
        d="M8.2 16.4h7.6"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
}

function FaceHappy() {
  return (
    <>
      <PillEyes />
      <path
        d="M8 14.8c1.4 2.2 6.6 2.2 8 0"
        fill="none"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </>
  );
}

function FaceBeaming() {
  return (
    <>
      <PillEyes />
      <path
        d="M8 14.6
           C8 14.3 8.25 14.1 8.55 14.1
           H15.45
           C15.75 14.1 16 14.3 16 14.6
           C16 17.1 14.35 18.8 12 18.8
           C9.65 18.8 8 17.1 8 14.6Z"
        stroke="none"
      />
    </>
  );
}
