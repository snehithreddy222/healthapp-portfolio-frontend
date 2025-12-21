import React from "react";

/**
 * Card wrapper with title and optional top-right action slot.
 * Gives the soft border + shadow from the design.
 */
export default function SectionCard({ title, action, children, className = "" }) {
  return (
    <div className={`card-soft ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
