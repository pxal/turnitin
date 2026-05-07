"use client";

import {
  ButtonHTMLAttributes,
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes
} from "react";

export const adminTokens = {
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  surfaceSubtle: "#f1f5f9",
  border: "#e2e8f0",
  borderSoft: "#eef2f7",
  textPrimary: "#0f172a",
  textSecondary: "#334155",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  brand: "#2563eb",
  brandSoft: "#dbeafe",
  brandDeep: "#1d4ed8",
  success: "#059669",
  successSoft: "#dcfce7",
  successDeep: "#166534",
  warning: "#d97706",
  warningSoft: "#fef3c7",
  warningDeep: "#92400e",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  dangerDeep: "#991b1b",
  violet: "#7c3aed",
  violetSoft: "#ede9fe",
  violetDeep: "#5b21b6",
  cyan: "#0891b2",
  cyanSoft: "#cffafe",
  cyanDeep: "#155e75",
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.05)",
  shadowMd: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
  shadowLg: "0 12px 32px rgba(15, 23, 42, 0.08)",
  radiusLg: "16px",
  radiusMd: "12px",
  radiusSm: "10px"
} as const;

export type AdminTone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "violet"
  | "cyan";

const TONE_MAP: Record<
  AdminTone,
  { bg: string; fg: string; border: string; dot: string }
> = {
  neutral: {
    bg: adminTokens.surfaceSubtle,
    fg: adminTokens.textSecondary,
    border: adminTokens.border,
    dot: adminTokens.textSubtle
  },
  brand: {
    bg: adminTokens.brandSoft,
    fg: adminTokens.brandDeep,
    border: "#bfdbfe",
    dot: adminTokens.brand
  },
  success: {
    bg: adminTokens.successSoft,
    fg: adminTokens.successDeep,
    border: "#bbf7d0",
    dot: adminTokens.success
  },
  warning: {
    bg: adminTokens.warningSoft,
    fg: adminTokens.warningDeep,
    border: "#fde68a",
    dot: adminTokens.warning
  },
  danger: {
    bg: adminTokens.dangerSoft,
    fg: adminTokens.dangerDeep,
    border: "#fecaca",
    dot: adminTokens.danger
  },
  violet: {
    bg: adminTokens.violetSoft,
    fg: adminTokens.violetDeep,
    border: "#ddd6fe",
    dot: adminTokens.violet
  },
  cyan: {
    bg: adminTokens.cyanSoft,
    fg: adminTokens.cyanDeep,
    border: "#a5f3fc",
    dot: adminTokens.cyan
  }
};

export function getToneStyles(tone: AdminTone) {
  return TONE_MAP[tone];
}

export function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  actions,
  children
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header
      style={{
        background: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: adminTokens.radiusLg,
        padding: "20px 24px",
        boxShadow: adminTokens.shadowMd,
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flex: "1 1 320px", minWidth: 0 }}>
          {icon ? (
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                color: adminTokens.brandDeep,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #dbeafe"
              }}
            >
              {icon}
            </div>
          ) : null}
          <div style={{ minWidth: 0 }}>
            {eyebrow ? (
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: adminTokens.brand,
                  fontWeight: 700,
                  marginBottom: "6px"
                }}
              >
                {eyebrow}
              </div>
            ) : null}
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 800,
                color: adminTokens.textPrimary,
                lineHeight: 1.2
              }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                style={{
                  margin: "6px 0 0",
                  color: adminTokens.textMuted,
                  fontSize: "14px",
                  lineHeight: 1.6
                }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function AdminCard({
  children,
  padding = "20px",
  style
}: {
  children: ReactNode;
  padding?: string | number;
  style?: CSSProperties;
}) {
  return (
    <section
      style={{
        background: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: adminTokens.radiusLg,
        boxShadow: adminTokens.shadowMd,
        padding,
        ...style
      }}
    >
      {children}
    </section>
  );
}

export function AdminSectionHeader({
  title,
  subtitle,
  icon,
  actions,
  align = "center"
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: "12px",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: "18px"
      }}
    >
      <div style={{ display: "flex", gap: "12px", alignItems: align === "center" ? "center" : "flex-start", minWidth: 0 }}>
        {icon ? (
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: adminTokens.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}
          >
            {icon}
          </div>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: adminTokens.textPrimary
            }}
          >
            {title}
          </h3>
          {subtitle ? (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: adminTokens.textMuted,
                lineHeight: 1.6
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({
  tone = "neutral",
  children,
  withDot = true,
  size = "md"
}: {
  tone?: AdminTone;
  children: ReactNode;
  withDot?: boolean;
  size?: "sm" | "md";
}) {
  const palette = TONE_MAP[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        borderRadius: "999px",
        fontSize: size === "sm" ? "11px" : "12px",
        fontWeight: 600,
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        lineHeight: 1.2,
        whiteSpace: "nowrap"
      }}
    >
      {withDot ? (
        <span
          aria-hidden
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "999px",
            background: palette.dot
          }}
        />
      ) : null}
      {children}
    </span>
  );
}

export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "violet";

const BUTTON_STYLES: Record<AdminButtonVariant, CSSProperties> = {
  primary: {
    background: adminTokens.brand,
    color: "#ffffff",
    border: `1px solid ${adminTokens.brand}`
  },
  secondary: {
    background: adminTokens.surface,
    color: adminTokens.textPrimary,
    border: `1px solid ${adminTokens.border}`
  },
  ghost: {
    background: "#eff6ff",
    color: adminTokens.brand,
    border: "1px solid #dbeafe"
  },
  danger: {
    background: adminTokens.dangerSoft,
    color: adminTokens.danger,
    border: "1px solid #fecaca"
  },
  success: {
    background: adminTokens.success,
    color: "#ffffff",
    border: `1px solid ${adminTokens.success}`
  },
  violet: {
    background: adminTokens.violet,
    color: "#ffffff",
    border: `1px solid ${adminTokens.violet}`
  }
};

export function AdminButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  style,
  children,
  ...rest
}: {
  variant?: AdminButtonVariant;
  size?: "sm" | "md";
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeStyle: CSSProperties =
    size === "sm"
      ? { padding: "6px 12px", fontSize: "12px", minHeight: "32px" }
      : { padding: "10px 16px", fontSize: "13px", minHeight: "40px" };

  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        borderRadius: adminTokens.radiusSm,
        fontWeight: 600,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.65 : 1,
        width: fullWidth ? "100%" : undefined,
        transition: "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease",
        ...sizeStyle,
        ...BUTTON_STYLES[variant],
        ...style
      }}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

export function AdminInput({
  label,
  hint,
  error,
  startAdornment,
  inputStyle,
  containerStyle,
  ...rest
}: {
  label?: string;
  hint?: string;
  error?: string;
  startAdornment?: ReactNode;
  inputStyle?: CSSProperties;
  containerStyle?: CSSProperties;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", ...containerStyle }}>
      {label ? (
        <span
          style={{
            fontSize: "12px",
            color: adminTokens.textMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: adminTokens.surfaceMuted,
          border: `1px solid ${error ? "#fca5a5" : adminTokens.border}`,
          borderRadius: adminTokens.radiusSm,
          padding: "0 12px"
        }}
      >
        {startAdornment ? (
          <span style={{ color: adminTokens.textSubtle, display: "inline-flex" }}>{startAdornment}</span>
        ) : null}
        <input
          {...rest}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: adminTokens.textPrimary,
            fontSize: "14px",
            padding: "10px 0",
            fontFamily: "inherit",
            ...inputStyle
          }}
        />
      </span>
      {hint && !error ? (
        <span style={{ fontSize: "12px", color: adminTokens.textMuted }}>{hint}</span>
      ) : null}
      {error ? (
        <span style={{ fontSize: "12px", color: adminTokens.danger, fontWeight: 600 }}>{error}</span>
      ) : null}
    </label>
  );
}

export function AdminSelect({
  label,
  hint,
  error,
  selectStyle,
  containerStyle,
  children,
  ...rest
}: {
  label?: string;
  hint?: string;
  error?: string;
  selectStyle?: CSSProperties;
  containerStyle?: CSSProperties;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px", ...containerStyle }}>
      {label ? (
        <span
          style={{
            fontSize: "12px",
            color: adminTokens.textMuted,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}
        >
          {label}
        </span>
      ) : null}
      <select
        {...rest}
        style={{
          background: adminTokens.surfaceMuted,
          border: `1px solid ${error ? "#fca5a5" : adminTokens.border}`,
          borderRadius: adminTokens.radiusSm,
          padding: "10px 14px",
          fontSize: "14px",
          color: adminTokens.textPrimary,
          fontFamily: "inherit",
          fontWeight: 500,
          minHeight: "40px",
          ...selectStyle
        }}
      >
        {children}
      </select>
      {hint && !error ? (
        <span style={{ fontSize: "12px", color: adminTokens.textMuted }}>{hint}</span>
      ) : null}
      {error ? (
        <span style={{ fontSize: "12px", color: adminTokens.danger, fontWeight: 600 }}>{error}</span>
      ) : null}
    </label>
  );
}

export function AdminCheckbox({
  label,
  description,
  checked,
  onChange,
  disabled
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: adminTokens.radiusSm,
        border: `1px solid ${adminTokens.border}`,
        background: adminTokens.surfaceMuted,
        cursor: disabled ? "not-allowed" : "pointer"
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: "3px", accentColor: adminTokens.brand }}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: adminTokens.textSecondary, fontSize: "14px" }}>{label}</span>
        {description ? (
          <span style={{ fontSize: "12px", color: adminTokens.textMuted, lineHeight: 1.55 }}>{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function AdminAlert({
  tone = "brand",
  title,
  children
}: {
  tone?: AdminTone;
  title?: string;
  children: ReactNode;
}) {
  const palette = TONE_MAP[tone];
  return (
    <div
      role="status"
      style={{
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: adminTokens.radiusMd,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.fg
      }}
    >
      <span
        aria-hidden
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          background: palette.dot,
          marginTop: "8px",
          flexShrink: 0
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
        {title ? (
          <span style={{ fontWeight: 700, fontSize: "13px" }}>{title}</span>
        ) : null}
        <span style={{ fontSize: "13px", lineHeight: 1.6 }}>{children}</span>
      </div>
    </div>
  );
}

export function AdminEmptyState({
  title,
  description,
  icon,
  action
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 20px",
        gap: "12px",
        color: adminTokens.textMuted
      }}
    >
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: adminTokens.surfaceMuted,
          border: `1px solid ${adminTokens.border}`,
          color: adminTokens.textSubtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        {icon ?? <DefaultEmptyIcon />}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: adminTokens.textPrimary, fontSize: "15px" }}>{title}</div>
        {description ? (
          <div style={{ fontSize: "13px", color: adminTokens.textMuted, marginTop: "4px", maxWidth: "360px" }}>
            {description}
          </div>
        ) : null}
      </div>
      {action ? <div style={{ marginTop: "4px" }}>{action}</div> : null}
    </div>
  );
}

function DefaultEmptyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function AdminPagination({
  page,
  totalPages,
  totalItems,
  onPrevious,
  onNext,
  itemLabel = "data"
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel?: string;
}) {
  if (totalItems <= 0) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap",
        padding: "12px 4px"
      }}
    >
      <div style={{ fontSize: "13px", color: adminTokens.textMuted, fontWeight: 600 }}>
        Halaman {page} dari {safeTotalPages} • {totalItems} {itemLabel}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <AdminButton variant="secondary" size="sm" onClick={onPrevious} disabled={page <= 1}>
          ← Sebelumnya
        </AdminButton>
        <AdminButton variant="secondary" size="sm" onClick={onNext} disabled={page >= safeTotalPages}>
          Berikutnya →
        </AdminButton>
      </div>
    </div>
  );
}

export function AdminTableShell({ children, minWidth }: { children: ReactNode; minWidth?: number }) {
  return (
    <div
      style={{
        background: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: adminTokens.radiusLg,
        overflow: "hidden",
        boxShadow: adminTokens.shadowMd
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            minWidth: minWidth ? `${minWidth}px` : undefined,
            borderCollapse: "collapse"
          }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export const adminTableStyles = {
  th: {
    padding: "14px 16px",
    textAlign: "left" as const,
    fontSize: "11px",
    fontWeight: 700,
    color: adminTokens.textSubtle,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    background: adminTokens.surfaceMuted,
    borderBottom: `1px solid ${adminTokens.border}`,
    whiteSpace: "nowrap" as const
  },
  td: {
    padding: "14px 16px",
    fontSize: "13px",
    color: adminTokens.textSecondary,
    borderBottom: `1px solid ${adminTokens.borderSoft}`,
    verticalAlign: "top" as const
  }
};

export function StatTile({
  label,
  value,
  hint,
  tone = "brand",
  icon
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: AdminTone;
  icon?: ReactNode;
}) {
  const palette = TONE_MAP[tone];
  return (
    <div
      style={{
        background: adminTokens.surface,
        border: `1px solid ${adminTokens.border}`,
        borderRadius: adminTokens.radiusMd,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minHeight: "108px",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: palette.dot
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <div style={{ fontSize: "12px", color: adminTokens.textMuted, fontWeight: 600 }}>{label}</div>
        {icon ? (
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "8px",
              background: palette.bg,
              color: palette.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: adminTokens.textPrimary, lineHeight: 1.1 }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: "12px", color: adminTokens.textMuted }}>{hint}</div>
      ) : null}
    </div>
  );
}
