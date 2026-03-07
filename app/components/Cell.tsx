"use client"

import React, { memo } from "react"
import { CellProps } from "../types"
import { evaluateFormula } from "lib/formulas"

function CellComponent({
  id,
  data,
  isActive,
  otherUser,
  onFocus,
  onBlur,
  onChange,
  cells
}: CellProps) {

  const displayValue = isActive
    ? data?.value || ""
    : evaluateFormula(data?.value || "", cells)

  return (
    <td className="border p-0 h-10 w-40 relative group hover:bg-blue-50 transition">

      {otherUser && (
        <div
          className="absolute inset-0 border-2 pointer-events-none z-10 animate-pulse"
          style={{ borderColor: otherUser.color }}
        />
      )}

      {data?.lastEditedBy && (
        <div className="absolute -top-8 left-0 hidden group-hover:block bg-gray-900 text-white text-[9px] px-2 py-1 rounded shadow">
          By {data.lastEditedBy} at{" "}
          {new Date(data?.updatedAt || Date.now()).toLocaleTimeString()}
        </div>
      )}

      <input
        className={`w-full h-full px-2 outline-none
        ${data?.style?.bold ? "font-bold" : ""}
        ${data?.style?.italic ? "italic" : ""}
        ${isActive ? "bg-blue-50" : ""}
        `}
        value={displayValue}
        onFocus={() => onFocus(id)}
        onBlur={onBlur}
        onChange={(e) => onChange(id, e.target.value)}
      />

    </td>
  )
}

export default memo(
  CellComponent,
  (prev, next) => {
    return (
      prev.data?.value === next.data?.value &&
      prev.data?.updatedAt === next.data?.updatedAt &&
      prev.data?.style?.bold === next.data?.style?.bold &&
      prev.data?.style?.italic === next.data?.style?.italic &&
      prev.isActive === next.isActive &&
      prev.otherUser?.uid === next.otherUser?.uid &&
      prev.otherUser?.cursor === next.otherUser?.cursor
    )
  }
)