/** Aviso no topo da lista "Grade semanal de treinos": a semana inteira se edita melhor no editor da grade. */
export function AvisoEditorGrade() {
  return (
    <p
      style={{
        margin: '0 0 16px',
        padding: '10px 14px',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 6,
        background: 'var(--theme-elevation-50)',
      }}
    >
      Para mudar vários horários de uma vez, com pré-visualização igual ao site, use o{' '}
      <a href="/admin/grade-treinos" style={{ fontWeight: 600 }}>
        editor da grade de treinos
      </a>
      .
    </p>
  )
}
