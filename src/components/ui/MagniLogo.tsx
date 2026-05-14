// Magni hammer logo — matches the web app sidebar icon exactly
// Blue rounded rect + white hammer head + handle + Uruz + Tiwaz runes

export function MagniLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue background */}
      <rect width="32" height="32" rx="7" fill="#5B7FFF" />
      {/* Hammer head */}
      <rect x="3.5" y="5" width="25" height="10" rx="2" fill="white" />
      {/* Handle */}
      <rect x="13" y="15" width="6" height="12" rx="1.5" fill="white" />
      {/* Uruz rune (left side of head) */}
      <line x1="7"  y1="7.5" x2="7"  y2="13" stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="7.5" x2="11" y2="13" stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7"  y1="7.5" x2="11" y2="10.5" stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
      {/* Tiwaz rune (right side of head) */}
      <line x1="22" y1="7.5" x2="22" y2="13"  stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.5" y1="9.8" x2="22" y2="7.5" stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="24.5" y1="9.8" x2="22" y2="7.5" stroke="#5B7FFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
