type LoadingSkeletonProps = {
  variant?: "dashboard" | "card" | "chart" | "table" | "drawer";
  rows?: number;
};

export function LoadingSkeleton({ variant = "card", rows = 5 }: LoadingSkeletonProps) {
  if (variant === "dashboard") {
    return (
      <div className="dashboard-skeleton" aria-label="Loading dashboard">
        <div className="skeleton skeleton-title" />
        <div className="metric-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="panel metric-card" key={index}>
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-value" />
            </div>
          ))}
        </div>
        <div className="grid-main">
          <div className="panel panel--chart">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-chart" />
          </div>
          <div className="panel">
            {Array.from({ length: rows }).map((_, index) => (
              <div className="skeleton skeleton-row" key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "chart") {
    return <div className="skeleton skeleton-chart" aria-label="Loading chart" />;
  }

  if (variant === "table") {
    return (
      <div className="skeleton-table" aria-label="Loading table">
        {Array.from({ length: rows }).map((_, index) => (
          <div className="skeleton skeleton-row" key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={`skeleton-stack skeleton-stack--${variant}`} aria-label="Loading">
      <div className="skeleton skeleton-label" />
      <div className="skeleton skeleton-value" />
      <div className="skeleton skeleton-row" />
    </div>
  );
}
