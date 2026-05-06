import type { ReactNode } from "react";

type AffiliatePageShellProps = {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  align?: "left" | "center";
  maxWidth?: string;
};

export default function AffiliatePageShell({
  eyebrow,
  title,
  description,
  children,
  align = "left",
  maxWidth = "1200px"
}: AffiliatePageShellProps) {
  const isCentered = align === "center";
  const hasHeader = !!(eyebrow || title || description);

  return (
    <main style={{ minHeight: "100vh", padding: "90px 0 60px", position: "relative", overflow: "hidden" }}>
      <div className="blob" style={{ top: "12%", left: "84%", width: "340px", height: "340px", opacity: 0.13 }} />
      <div className="blob" style={{ top: "72%", left: "14%", width: "300px", height: "300px", opacity: 0.11, background: "linear-gradient(135deg, var(--accent), var(--primary))" }} />

      <div className="container" style={{ position: "relative", zIndex: 1, maxWidth }}>
        {hasHeader && (
          <div style={{ marginBottom: "36px", textAlign: isCentered ? "center" : "left" }}>
            {eyebrow ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: "rgba(11,79,217,0.1)",
                  border: "1px solid rgba(11,79,217,0.16)",
                  color: "var(--primary)",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.6px",
                  marginBottom: "18px"
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <h1 style={{ fontSize: "clamp(2.25rem, 5vw, 4rem)", fontWeight: 900, lineHeight: 1.05, marginBottom: "14px" }}>
                {title}
              </h1>
            ) : null}
            {description ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "17px",
                  lineHeight: 1.8,
                  maxWidth: isCentered ? "720px" : "760px",
                  margin: isCentered ? "0 auto" : "0"
                }}
              >
                {description}
              </p>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
