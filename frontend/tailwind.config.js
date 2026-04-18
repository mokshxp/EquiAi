/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:        '#6d28d9',
        'primary-hover':'#5b21b6',
        'primary-light':'#7c3aed',
        surface:        '#f5f3ff',
        'surface-accent':'#ede9fe',
        'border-soft':  '#ddd6fe',
        'border-dark':  '#c4b5fd',
        navy:           '#1a1630',
        'text-muted':   '#6b7280',
        'text-hint':    '#9ca3af',
        'success-c':    '#059669',
        'success-bg':   '#d1fae5',
        'success-border':'#6ee7b7',
        'warning-c':    '#d97706',
        'warning-bg':   '#fef3c7',
        'warning-border':'#fcd34d',
        'danger-c':     '#dc2626',
        'danger-bg':    '#fee2e2',
        'danger-border':'#fca5a5',
      },
      borderRadius: {
        card:    '12px',
        'l-card':'20px',
        pill:    '999px',
      },
    },
  },
  plugins: [],
}
