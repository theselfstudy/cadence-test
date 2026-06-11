"use client";

const iconSize = "w-5 h-5"; // ~28px, similar to text-2xl emoji

// =============================================================================
// WEEKLY ICON - Calendar square with current date
// =============================================================================
export function WeeklyIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  const currentDate = new Date().getDate();

  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} text-app-teal ${className} ${isHovered ? "animate-calendar-bounce" : ""}`}
      >
        {/* Calendar outline */}
        <rect x="3" y="4" width="18" height="18" rx="2" />
        {/* Calendar top tabs */}
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="16" y1="2" x2="16" y2="6" />
        {/* Date number */}
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontSize="9"
          fontWeight="bold"
        >
          {currentDate}
        </text>
      </svg>
      <style>{`
        @keyframes calendar-bounce {
          0% { transform: translateY(0); }
          40% { transform: translateY(-2px); }
          70% { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
        .animate-calendar-bounce {
          animation: calendar-bounce 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// MONTHLY ICON - Calendar square with month abbreviation
// =============================================================================
export function MonthlyIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = months[new Date().getMonth()];

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${iconSize} text-app-green ${className} ${isHovered ? "animate-calendar-bounce" : ""}`}
    >
      {/* Calendar outline */}
      <rect x="3" y="4" width="18" height="18" rx="2" />
      {/* Calendar top tabs */}
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      {/* Month text */}
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="6"
        fontWeight="bold"
      >
        {currentMonth}
      </text>
    </svg>
  );
}

// =============================================================================
// ALL INSIGHTS ICON - Wave that flows naturally on hover
// =============================================================================
export function AllInsightsIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} text-app-plumb ${className}`}
        style={{ overflow: "hidden" }}
      >
        {/* Extended wave path that flows through the viewBox */}
        <path
          d="M-6 12 Q-2 6, 2 12 T 10 12 T 18 12 T 26 12 T 34 12"
          className={isHovered ? "animate-wave-flow" : ""}
        />
      </svg>
      <style>{`
        @keyframes wave-flow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-8px); }
        }
        .animate-wave-flow {
          animation: wave-flow 0.4s ease-in-out forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// CYCLE INSIGHTS ICON - Teardrop with subtle bounce on hover
// =============================================================================
export function CycleInsightsIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} text-app-red ${className}`}
      >
        {/* Teardrop shape */}
        <path
          d="M12 2 C12 2 5 10 5 15 C5 19.5 8 22 12 22 C16 22 19 19.5 19 15 C19 10 12 2 12 2 Z"
          className={isHovered ? "animate-teardrop-settle" : ""}
        />
      </svg>
      <style>{`
        @keyframes teardrop-settle {
          0% { transform: translateY(-2px); }
          50% { transform: translateY(1px); }
          100% { transform: translateY(0); }
        }
        .animate-teardrop-settle {
          animation: teardrop-settle 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// HISTORY ICON - Book with bookmark that opens on hover
// =============================================================================
export function HistoryIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${iconSize} text-app-charcoal ${className}`}
    >
      {/* Book cover */}
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        className="transition-all duration-300"
        style={{
          transform: isHovered ? "rotateY(-10deg)" : "rotateY(0)",
          transformOrigin: "left center",
        }}
      />
      {/* Bookmark ribbon */}
      <path
        d="M9 2v6l2-1.5L13 8V2"
        fill="currentColor"
        className="text-app-red transition-transform duration-300"
        style={{
          transform: isHovered ? "translateY(2px)" : "translateY(0)",
        }}
      />
      {/* Page lines when hovered */}
      {isHovered && (
        <>
          <line x1="9" y1="12" x2="17" y2="12" strokeWidth="1.5" opacity="0.5" />
          <line x1="9" y1="15" x2="15" y2="15" strokeWidth="1.5" opacity="0.5" />
        </>
      )}
    </svg>
  );
}

// =============================================================================
// PDF EXPORTS ICON - Document with arrow that "prints out" on hover
// =============================================================================
export function PdfExportsIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} text-app-charcoal ${className}`}
      >
        {/* Document */}
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        {/* Download arrow that slides down on hover */}
        <g className={isHovered ? "animate-pdf-slide" : ""}>
          <line x1="12" y1="11" x2="12" y2="17" />
          <polyline points="9 14 12 17 15 14" />
        </g>
      </svg>
      <style>{`
        @keyframes pdf-slide {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(3px); opacity: 0.7; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-pdf-slide {
          animation: pdf-slide 0.4s ease-in-out forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// SETTINGS ICON - Gear that rotates on hover
// =============================================================================
export function SettingsIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} ${className}`}
      >
        <g className={isHovered ? "animate-gear-spin" : ""} style={{ transformOrigin: "center" }}>
          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </g>
      </svg>
      <style>{`
        @keyframes gear-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(90deg); }
        }
        .animate-gear-spin {
          animation: gear-spin 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// DASHBOARD ICON - Bar chart with bars that bounce on hover
// =============================================================================
export function DashboardIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} ${className}`}
      >
        {/* Left bar - short */}
        <rect
          x="4" y="13" width="4" height="8" rx="1"
          className={isHovered ? "animate-bar-bounce-1" : ""}
          style={{ transformOrigin: "center bottom" }}
        />
        {/* Middle bar - tall */}
        <rect
          x="10" y="5" width="4" height="16" rx="1"
          className={isHovered ? "animate-bar-bounce-2" : ""}
          style={{ transformOrigin: "center bottom" }}
        />
        {/* Right bar - medium */}
        <rect
          x="16" y="9" width="4" height="12" rx="1"
          className={isHovered ? "animate-bar-bounce-3" : ""}
          style={{ transformOrigin: "center bottom" }}
        />
      </svg>
      <style>{`
        @keyframes bar-bounce-1 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.7); }
        }
        @keyframes bar-bounce-2 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.85); }
        }
        @keyframes bar-bounce-3 {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.75); }
        }
        .animate-bar-bounce-1 {
          animation: bar-bounce-1 0.4s ease-in-out forwards;
        }
        .animate-bar-bounce-2 {
          animation: bar-bounce-2 0.4s ease-in-out 0.05s forwards;
        }
        .animate-bar-bounce-3 {
          animation: bar-bounce-3 0.4s ease-in-out 0.1s forwards;
        }
      `}</style>
    </>
  );
}

// =============================================================================
// CONTACT ICON - Envelope with flap that lifts on hover
// =============================================================================
export function ContactIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${iconSize} text-app-charcoal ${className}`}
      >
        {/* Envelope body */}
        <rect x="3" y="5" width="18" height="14" rx="2" />
        {/* Envelope flap - stays open on hover, closes when not */}
        <path
          d="M3 7l9 6 9-6"
          className="contact-flap"
          style={{
            transformOrigin: "12px 7px",
            transform: isHovered ? "scaleY(0.85) translateY(-1px)" : "scaleY(1)",
            transition: "transform 0.25s ease-in-out",
          }}
        />
      </svg>
    </>
  );
}

// =============================================================================
// NEW ENTRY ICON - Plus that morphs into checkmark on hover
// =============================================================================
export function NewEntryIcon({ className = "", isHovered = false }: { className?: string; isHovered?: boolean }) {
  return (
    <div className={`${iconSize} ${className} relative`}>
      {/* Plus icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isHovered ? "opacity-0" : "opacity-100"}`}
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {/* Checkmark icon */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}
      >
        <polyline points="6 12 10 16 18 8" />
      </svg>
    </div>
  );
}
