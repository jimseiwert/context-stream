import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description?: string;
  issue?: string;
}

export function ComingSoon({ title, description, issue }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div
        className="flex items-center justify-center w-14 h-14 rounded-xl"
        style={{
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.2)",
          color: "var(--app-accent-green)",
        }}
      >
        <Construction size={24} />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold" style={{ color: "var(--app-text-primary)" }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
          {description ?? "This feature is coming soon."}
        </p>
        {issue && (
          <a
            href={issue}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs mt-2 hover:underline"
            style={{ color: "var(--app-accent-cyan)" }}
          >
            Track progress on GitHub →
          </a>
        )}
      </div>
    </div>
  );
}
