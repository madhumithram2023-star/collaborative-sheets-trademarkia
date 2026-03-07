
import { CellData } from "../app/types"

export const evaluateFormula = (
  input: string,
  data: Record<string, CellData>
): string => {
  if (!input || !input.startsWith("=")) return input;

  try {
    let formula = input.substring(1).toUpperCase();

    // Handling SUM(A1,A2,B1)
    if (formula.startsWith("SUM")) {
      const match = formula.match(/\(([^)]+)\)/);
      if (!match) return "#ERROR";

      const refs = match[1].split(",").map((r) => r.trim());

      const sum = refs.reduce((acc, ref) => {
        const cell = data[ref];
        const val = parseFloat(
          evaluateFormula(cell?.value || "0", data)
        );
        return acc + (isNaN(val) ? 0 : val);
      }, 0);

      return sum.toString();
    }

    // Replace cell references (A1, B2, etc)
    formula = formula.replace(/[A-Z][0-9]+/g, (match) => {
      const cell = data[match];
      const val = parseFloat(
        evaluateFormula(cell?.value || "0", data)
      );
      return isNaN(val) ? "0" : val.toString();
    });

    // Evaluate math expression safely
    const result = Function(`"use strict"; return (${formula})`)();

    return result.toString();
  } catch {
    return "#ERROR";
  }
};