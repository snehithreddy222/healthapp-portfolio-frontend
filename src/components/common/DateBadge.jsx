import React from "react";

/**
 * Square date badge like the mock (OCT / 28).
 * Usage: <DateBadge mon="OCT" day="28" />
 */
export default function DateBadge({ mon = "OCT", day = "28" }) {
  return (
    <div className="date-tile">
      <div className="flex flex-col items-center leading-none">
        <span className="text-[11px] font-semibold text-sky-700 tracking-wide">
          {mon}
        </span>
        <span className="text-2xl font-extrabold text-sky-800">{day}</span>
      </div>
    </div>
  );
}
