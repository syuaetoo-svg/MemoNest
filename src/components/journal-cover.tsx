/** Decorative fallback only; never becomes part of a saved journal entry. */
export function JournalCover() {
  return <span className="overview-note-cover" aria-hidden="true">
    <svg viewBox="0 0 202 142" fill="none">
      <ellipse cx="106" cy="116" rx="51" ry="7" fill="#c6bbd4" opacity=".16"/>
      <g transform="rotate(-9 100 76)">
        <rect x="65" y="27" width="81" height="89" rx="8" fill="#e5deee" opacity=".7"/>
        <rect x="57" y="22" width="82" height="90" rx="7" fill="#fcfbfd" stroke="#ded7e6"/>
        <path d="M67 23v88M78 44h43M78 52h34M78 76h43M78 84h37M78 92h25" stroke="#d7cde3" strokeLinecap="round"/>
        <path d="M113 22v28l6-4 6 4V22" fill="#d6c6e5" opacity=".75"/>
      </g>
      <path d="M151 38v10m-5-5h10M43 96v6m-3-3h6" stroke="#c8bad8" strokeLinecap="round"/>
      <circle cx="156" cy="102" r="3" fill="#ded4e9"/>
    </svg>
  </span>;
}
