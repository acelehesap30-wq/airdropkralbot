/**
 * Blueprint: Trust / Verification badges
 * Human language, not technical codes
 */
interface StatusBadgeProps {
  status: 'pending' | 'review' | 'approved' | 'rejected' | 'paid' | 'active' | 'inactive';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(255,170,0,0.15)', text: 'var(--color-warning)' },
  review: { bg: 'rgba(255,170,0,0.15)', text: 'var(--color-warning)' },
  approved: { bg: 'rgba(0,255,136,0.15)', text: 'var(--color-success)' },
  paid: { bg: 'rgba(0,255,136,0.15)', text: 'var(--color-success)' },
  active: { bg: 'rgba(0,212,255,0.15)', text: 'var(--color-accent)' },
  rejected: { bg: 'rgba(255,68,102,0.15)', text: 'var(--color-danger)' },
  inactive: { bg: 'rgba(136,136,160,0.15)', text: 'var(--color-text-secondary)' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.inactive;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        background: colors.bg,
        color: colors.text,
      }}
    >
      {status}
    </span>
  );
}
