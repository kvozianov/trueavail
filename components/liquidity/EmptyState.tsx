type EmptyStateProps = {
  title?: string;
  message?: string;
  fieldName?: string;
};

export function EmptyState({
  title = "No verified backend data",
  message = "This UI element is hidden until the backend returns a supported payload.",
  fieldName,
}: EmptyStateProps) {
  return (
    <div className="state state--empty">
      <p className="state__eyebrow">Empty</p>
      <h3>{title}</h3>
      <p>{message}</p>
      {fieldName ? <code>{fieldName}</code> : null}
    </div>
  );
}
