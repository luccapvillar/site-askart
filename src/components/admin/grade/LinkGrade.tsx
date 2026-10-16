/** Atalho para o editor da grade de treinos (/admin/grade-treinos) no menu lateral do painel. */
export function LinkGrade() {
  return (
    <a
      href="/admin/grade-treinos"
      style={{
        display: 'block',
        margin: '0 0 12px',
        padding: '10px 12px',
        border: '1px solid var(--theme-elevation-250)',
        borderRadius: 6,
        color: 'var(--theme-text)',
        fontWeight: 600,
        textDecoration: 'none',
      }}
    >
      Grade de treinos
    </a>
  )
}
