import { EmptyState } from "./EmptyState";

type DataQualityPanelProps = {
  notes?: unknown[];
};

export function DataQualityPanel({ notes }: DataQualityPanelProps) {
  const rows = Array.isArray(notes) ? notes : [];

  if (!rows.length) {
    return (
      <EmptyState
        title="No data-quality notes"
        message="The backend did not return data_quality_notes for this explanation."
        fieldName="explanation.data_quality_notes"
      />
    );
  }

  return (
    <ul className="quality-list">
      {rows.map((note, index) => (
        <li key={`${index}-${String(note).slice(0, 24)}`}>{String(note)}</li>
      ))}
    </ul>
  );
}
