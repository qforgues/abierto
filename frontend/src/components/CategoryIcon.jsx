import React from 'react';

// Minimal line icons, one per category. All use currentColor so they adapt
// to the pill state (dark on white, white on the active teal). A touch of
// island flair where it fits: a garnish on the cocktail, a beach umbrella + wave, a palm-ish tree.
const PATHS = {
  All: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  'Food Truck': (
    <>
      <path d="M10 17h4V6H3v11h2" />
      <path d="M14 9h4l3 3v5h-2" />
      <path d="M14 17h1" />
      <circle cx="7.5" cy="17.5" r="2.2" />
      <circle cx="17.5" cy="17.5" r="2.2" />
    </>
  ),
  Restaurant: (
    <>
      <path d="M4 3v6a2.2 2.2 0 0 0 4.4 0V3" />
      <path d="M6.2 11v10" />
      <path d="M19 3c-2 0-3.4 2-3.4 4.5S17 12 19 12" />
      <path d="M19 3v18" />
    </>
  ),
  Bar: (
    <>
      <path d="M5 4h14l-7 8Z" />
      <path d="M12 12v7" />
      <path d="M8.5 21h7" />
      <path d="M12.5 9.5 16 4.5" />
      <circle cx="16.3" cy="4.2" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  Cafe: (
    <>
      <path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
      <path d="M17 9h1.5a3 3 0 0 1 0 6H17" />
      <path d="M7 2.5c-.6.8-.6 1.7 0 2.5M11 2.5c-.6.8-.6 1.7 0 2.5" />
    </>
  ),
  Beach: (
    <>
      <path d="M3 11a9 5 0 0 1 18 0Z" />
      <path d="M12 11v6" />
      <path d="M3 20c1.4-1.4 2.8-1.4 4.2 0s2.8 1.4 4.2 0 2.8-1.4 4.2 0 2.8 1.4 4.2 0" />
    </>
  ),
  Attraction: (
    <>
      <path d="m12 3 2.5 5.3 5.5.5-4.2 3.7 1.3 5.5L12 20.4 6.9 18l1.3-5.5L4 8.8l5.5-.5Z" />
    </>
  ),
  Shop: (
    <>
      <path d="M6 2 3 6.5V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5L18 2Z" />
      <path d="M3 6.5h18" />
      <path d="M16 10.5a4 4 0 0 1-8 0" />
    </>
  ),
  Park: (
    <>
      <path d="M12 3a6.5 6.5 0 0 0-3 12.3V17a3 3 0 0 0 6 0v-1.7A6.5 6.5 0 0 0 12 3Z" />
      <path d="M12 22v-5" />
    </>
  ),
  Service: (
    <>
      <path d="M14.6 6.3a5 5 0 0 0-6.5 6.4l-5 5a2.1 2.1 0 0 0 3 3l5-5a5 5 0 0 0 6.4-6.5l-2.9 2.9-2.4-.6-.6-2.4Z" />
    </>
  ),
  Transportation: (
    <>
      <path d="M4 12 5.6 7.4A2 2 0 0 1 7.5 6h9a2 2 0 0 1 1.9 1.4L20 12" />
      <path d="M3 12h18v5a1 1 0 0 1-1 1h-1.5" />
      <path d="M6.5 18H5a1 1 0 0 1-1-1v-5" />
      <path d="M9 18h6" />
      <circle cx="7.5" cy="18" r="1.6" />
      <circle cx="16.5" cy="18" r="1.6" />
    </>
  ),
  Other: (
    <>
      <path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.6" />
    </>
  ),
  Closed: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M7.5 11V7.5a4.5 4.5 0 0 1 9 0V11" />
    </>
  ),
};

export default function CategoryIcon({ name, size = 22 }) {
  const paths = PATHS[name] || PATHS.Other;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  );
}
