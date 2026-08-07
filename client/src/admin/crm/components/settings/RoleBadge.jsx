const ROLE_STYLES = {
  super_admin: 'bg-violet-100 text-violet-800',
  sales_manager: 'bg-blue-100 text-blue-800',
  sales_rep: 'bg-emerald-100 text-emerald-800',
  viewer: 'bg-neutral-100 text-neutral-700',
  designer: 'bg-pink-100 text-pink-800',
};

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  sales_manager: 'Sales Manager',
  sales_rep: 'Sales Rep',
  viewer: 'Viewer',
  designer: 'Designer',
};

export default function RoleBadge({ role }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_STYLES[role] || ROLE_STYLES.viewer}`}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}
