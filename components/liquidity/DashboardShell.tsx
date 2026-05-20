import type { ReactNode } from "react";
import type { DemoMetadataResponse } from "@/lib/backend/types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

type DashboardShellProps = {
  children: ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
  metadata?: DemoMetadataResponse;
  healthStatus?: string;
  generatedAt?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function DashboardShell({
  children,
  activeSection,
  onSectionChange,
  refreshing,
  onRefresh,
}: DashboardShellProps) {
  return (
    <div className="app-shell">
      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />
      <main className="app-main">
        <Topbar
          refreshing={refreshing}
          onRefresh={onRefresh}
          onNavigate={onSectionChange}
        />
        {children}
      </main>
    </div>
  );
}
