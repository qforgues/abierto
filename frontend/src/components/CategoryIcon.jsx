import React from 'react';

// Minimal line icons, one per category, as raw SVG markup so the same set is
// shared between the React <CategoryIcon> (pills, cards, pickers) and the map
// marker SVG (built as a data URI). A touch of island flair where it fits.
export const ICON_PATHS = {
  All: '<path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/>',
  'Food Truck': '<path d="M10 17h4V6H3v11h2"/><path d="M14 9h4l3 3v5h-2"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.2"/><circle cx="17.5" cy="17.5" r="2.2"/>',
  Restaurant: '<path d="M4 3v6a2.2 2.2 0 0 0 4.4 0V3"/><path d="M6.2 11v10"/><path d="M19 3c-2 0-3.4 2-3.4 4.5S17 12 19 12"/><path d="M19 3v18"/>',
  Bar: '<path d="M5 4h14l-7 8Z"/><path d="M12 12v7"/><path d="M8.5 21h7"/><path d="M12.5 9.5 16 4.5"/><circle cx="16.3" cy="4.2" r="1.1" fill="currentColor" stroke="none"/>',
  Cafe: '<path d="M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M17 9h1.5a3 3 0 0 1 0 6H17"/><path d="M7 2.5c-.6.8-.6 1.7 0 2.5M11 2.5c-.6.8-.6 1.7 0 2.5"/>',
  Beach: '<path d="M3 11a9 5 0 0 1 18 0Z"/><path d="M12 11v6"/><path d="M3 20c1.4-1.4 2.8-1.4 4.2 0s2.8 1.4 4.2 0 2.8-1.4 4.2 0 2.8 1.4 4.2 0"/>',
  Attraction: '<path d="M4 8.5h3L8.3 6.5h7.4L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.2"/>',
  Shop: '<path d="M6 2 3 6.5V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5L18 2Z"/><path d="M3 6.5h18"/><path d="M16 10.5a4 4 0 0 1-8 0"/>',
  Park: '<path d="M12 3 8 9h8Z"/><path d="M12 7 6.5 14h11Z"/><path d="M12 14v5"/><path d="M9.5 19h5"/>',
  Service: '<path d="M14.6 6.3a5 5 0 0 0-6.5 6.4l-5 5a2.1 2.1 0 0 0 3 3l5-5a5 5 0 0 0 6.4-6.5l-2.9 2.9-2.4-.6-.6-2.4Z"/>',
  Transportation: '<path d="M4 12 5.6 7.4A2 2 0 0 1 7.5 6h9a2 2 0 0 1 1.9 1.4L20 12"/><path d="M3 12h18v5a1 1 0 0 1-1 1h-1.5"/><path d="M6.5 18H5a1 1 0 0 1-1-1v-5"/><path d="M9 18h6"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/>',
  Other: '<path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10.5" r="2.6"/>',
  Closed: '<circle cx="12" cy="12" r="9"/><path d="M5.8 5.8 18.2 18.2"/>',
  Events: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/>',
  Clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
  Delivery: '<circle cx="6" cy="17" r="2.3"/><circle cx="17.5" cy="17" r="2.3"/><path d="M8.3 17h6.9"/><path d="M15.2 17 12.5 8.5H10"/><path d="M12.5 8.5H16l2 4.7"/><path d="M4.5 12H8l1.4 5"/>',
};

export default function CategoryIcon({ name, size = 22 }) {
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
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || ICON_PATHS.Other }}
    />
  );
}
