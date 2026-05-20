import { titleize } from "@/lib/backend/formatters";
import type { FormulaLike } from "@/lib/backend/types";

type FormulaCardProps = {
  formula: FormulaLike;
};

export function FormulaCard({ formula }: FormulaCardProps) {
  const title = formula.title ?? titleize(formula.key ?? formula.id);
  const body = formula.formula ?? formula.description ?? "No formula text returned.";
  const interpretation = formula.interpretation ?? formula.description;

  return (
    <article className="formula-card">
      <div className="formula-card__header">
        <h4>{title}</h4>
        {formula.key || formula.id ? <code>{String(formula.key ?? formula.id)}</code> : null}
      </div>
      <pre>{body}</pre>
      {interpretation && interpretation !== body ? <p>{interpretation}</p> : null}
      {formula.source ? <small>Source: {formula.source}</small> : null}
    </article>
  );
}
