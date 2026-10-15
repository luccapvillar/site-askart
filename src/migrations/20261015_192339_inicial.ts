import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_etapas_inicio_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum_etapas_fim_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum_etapas_status" AS ENUM('agendada', 'confirmada', 'adiada', 'cancelada', 'realizada');
  CREATE TYPE "public"."enum_etapas_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_corridas_resultados_status" AS ENUM('classificado', 'nao-classificado', 'abandono', 'desclassificado', 'nao-largou');
  CREATE TYPE "public"."enum_corridas_resultados_penalidade_tipo" AS ENUM('tempo', 'posicoes', 'pontos', 'advertencia');
  CREATE TYPE "public"."enum_corridas_tipo" AS ENUM('tomada-de-tempo', 'classificatoria', 'bateria', 'pre-final', 'final');
  CREATE TYPE "public"."enum_corridas_status" AS ENUM('rascunho', 'oficial', 'cancelada');
  CREATE TYPE "public"."enum_corridas_inicio_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum_temporada_categorias_ajustes_tipo" AS ENUM('penalidade', 'bonificacao', 'correcao');
  CREATE TYPE "public"."enum_temporada_categorias_modo" AS ENUM('automatico', 'manual');
  CREATE TYPE "public"."enum_pilotos_uf" AS ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');
  CREATE TYPE "public"."enum_pilotos_autorizacao_imagem_autorizada" AS ENUM('sim', 'nao');
  CREATE TYPE "public"."enum_pilotos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_inscricoes_condicao" AS ENUM('titular', 'convidado');
  CREATE TYPE "public"."enum_inscricoes_status" AS ENUM('ativa', 'desistente', 'transferida', 'excluida');
  CREATE TYPE "public"."enum_equipes_uf" AS ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO');
  CREATE TYPE "public"."enum_equipes_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_categorias_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_temporadas_formato_etapa_tipo" AS ENUM('tomada-de-tempo', 'classificatoria', 'bateria', 'pre-final', 'final');
  CREATE TYPE "public"."enum_temporadas_status" AS ENUM('planejada', 'em-andamento', 'encerrada');
  CREATE TYPE "public"."enum_temporadas_fonte_dados" AS ENUM('resultados', 'so-classificacao-final');
  CREATE TYPE "public"."enum_temporadas_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_campeonatos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_regras_pontuacao_criterios_desempate_criterio" AS ENUM('mais-vitorias', 'contagem-de-posicoes', 'melhor-resultado-ultima-etapa', 'mais-poles');
  CREATE TYPE "public"."enum_regras_pontuacao_requisito_participacao" AS ENUM('presente', 'largou', 'classificado');
  CREATE TYPE "public"."enum_regras_pontuacao_abandono" AS ENUM('pela-posicao', 'so-participacao', 'zero');
  CREATE TYPE "public"."enum_regras_pontuacao_convidados" AS ENUM('reclassificar-elegiveis', 'manter-posicoes');
  CREATE TYPE "public"."enum_regras_pontuacao_descartes_unidade" AS ENUM('etapa', 'corrida');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_criterios_desempate_criterio" AS ENUM('mais-vitorias', 'contagem-de-posicoes', 'melhor-resultado-ultima-etapa', 'mais-poles');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_requisito_participacao" AS ENUM('presente', 'largou', 'classificado');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_abandono" AS ENUM('pela-posicao', 'so-participacao', 'zero');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_convidados" AS ENUM('reclassificar-elegiveis', 'manter-posicoes');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_descartes_unidade" AS ENUM('etapa', 'corrida');
  CREATE TYPE "public"."enum_treinos_status" AS ENUM('liberado', 'extra', 'lotado', 'cancelado', 'bloqueado');
  CREATE TYPE "public"."enum_treinos_hora_inicio" AS ENUM('00:00', '00:15', '00:30', '00:45', '01:00', '01:15', '01:30', '01:45', '02:00', '02:15', '02:30', '02:45', '03:00', '03:15', '03:30', '03:45', '04:00', '04:15', '04:30', '04:45', '05:00', '05:15', '05:30', '05:45', '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30', '22:45', '23:00', '23:15', '23:30', '23:45');
  CREATE TYPE "public"."enum_treinos_hora_fim" AS ENUM('00:15', '00:30', '00:45', '01:00', '01:15', '01:30', '01:45', '02:00', '02:15', '02:30', '02:45', '03:00', '03:15', '03:30', '03:45', '04:00', '04:15', '04:30', '04:45', '05:00', '05:15', '05:30', '05:45', '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30', '22:45', '23:00', '23:15', '23:30', '23:45', '24:00');
  CREATE TYPE "public"."enum_treinos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_horarios_treino_dia_semana" AS ENUM('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo');
  CREATE TYPE "public"."enum_horarios_treino_hora_inicio" AS ENUM('00:00', '00:15', '00:30', '00:45', '01:00', '01:15', '01:30', '01:45', '02:00', '02:15', '02:30', '02:45', '03:00', '03:15', '03:30', '03:45', '04:00', '04:15', '04:30', '04:45', '05:00', '05:15', '05:30', '05:45', '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30', '22:45', '23:00', '23:15', '23:30', '23:45');
  CREATE TYPE "public"."enum_horarios_treino_hora_fim" AS ENUM('00:15', '00:30', '00:45', '01:00', '01:15', '01:30', '01:45', '02:00', '02:15', '02:30', '02:45', '03:00', '03:15', '03:30', '03:45', '04:00', '04:15', '04:30', '04:45', '05:00', '05:15', '05:30', '05:45', '06:00', '06:15', '06:30', '06:45', '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30', '20:45', '21:00', '21:15', '21:30', '21:45', '22:00', '22:15', '22:30', '22:45', '23:00', '23:15', '23:30', '23:45', '24:00');
  CREATE TYPE "public"."enum_horarios_treino_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_noticias_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_noticias_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__noticias_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__noticias_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_avisos_tipo" AS ENUM('alteracao-treino', 'alteracao-etapa', 'mudanca-horario', 'cancelamento', 'comunicado-oficial', 'informacao-importante');
  CREATE TYPE "public"."enum_avisos_nivel" AS ENUM('informativo', 'atencao', 'urgente');
  CREATE TYPE "public"."enum_avisos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_avisos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__avisos_v_version_tipo" AS ENUM('alteracao-treino', 'alteracao-etapa', 'mudanca-horario', 'cancelamento', 'comunicado-oficial', 'informacao-importante');
  CREATE TYPE "public"."enum__avisos_v_version_nivel" AS ENUM('informativo', 'atencao', 'urgente');
  CREATE TYPE "public"."enum__avisos_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__avisos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_banners_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_banners_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_banners_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_banners_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__banners_v_version_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__banners_v_version_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__banners_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__banners_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_galerias_exibicao" AS ENUM('grade', 'carrossel', 'mosaico');
  CREATE TYPE "public"."enum_galerias_tipo" AS ENUM('etapa', 'treino', 'evento', 'kartodromo', 'institucional', 'outro');
  CREATE TYPE "public"."enum_galerias_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_galerias_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__galerias_v_version_exibicao" AS ENUM('grade', 'carrossel', 'mosaico');
  CREATE TYPE "public"."enum__galerias_v_version_tipo" AS ENUM('etapa', 'treino', 'evento', 'kartodromo', 'institucional', 'outro');
  CREATE TYPE "public"."enum__galerias_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__galerias_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_documentos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_documentos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documentos_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__documentos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_eventos_inicio_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum_eventos_fim_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum_eventos_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_eventos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__eventos_v_version_inicio_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum__eventos_v_version_fim_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum__eventos_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__eventos_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_paginas_blocks_imagem_largura" AS ENUM('texto', 'larga', 'tela');
  CREATE TYPE "public"."enum_paginas_blocks_galeria_exibicao" AS ENUM('padrao', 'grade', 'carrossel', 'mosaico');
  CREATE TYPE "public"."enum_paginas_blocks_botao_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_paginas_blocks_botao_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_paginas_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_paginas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__paginas_v_blocks_imagem_largura" AS ENUM('texto', 'larga', 'tela');
  CREATE TYPE "public"."enum__paginas_v_blocks_galeria_exibicao" AS ENUM('padrao', 'grade', 'carrossel', 'mosaico');
  CREATE TYPE "public"."enum__paginas_v_blocks_botao_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__paginas_v_blocks_botao_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__paginas_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__paginas_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_perguntas_secao" AS ENUM('kartodromo', 'bks', 'geral');
  CREATE TYPE "public"."enum_perguntas_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum_usuarios_papel" AS ENUM('administrador', 'editor', 'colaborador');
  CREATE TYPE "public"."enum_atividades_acao" AS ENUM('criou', 'alterou', 'publicou', 'excluiu');
  CREATE TYPE "public"."enum_payload_folders_folder_type" AS ENUM('midia');
  CREATE TYPE "public"."enum_pagina_inicial_topo_botoes_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_topo_botoes_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_proxima_etapa_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_proxima_etapa_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_lideres_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_lideres_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_calendario_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_calendario_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_treinos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_treinos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_noticias_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_noticias_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_comunicados_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_comunicados_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_pilotos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_pilotos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_galeria_destaque_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_galeria_destaque_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_kartodromo_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_kartodromo_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_ingressos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_ingressos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_perguntas_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_perguntas_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_contato_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_contato_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_apoiadores_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_pagina_inicial_blocks_apoiadores_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_version_topo_botoes_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_version_topo_botoes_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_proxima_etapa_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_proxima_etapa_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_lideres_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_lideres_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_calendario_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_calendario_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_treinos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_treinos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_noticias_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_noticias_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_comunicados_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_comunicados_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_pilotos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_pilotos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_galeria_destaque_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_galeria_destaque_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_kartodromo_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_kartodromo_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_ingressos_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_ingressos_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_perguntas_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_perguntas_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_contato_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_contato_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_apoiadores_botao_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__pagina_inicial_v_blocks_apoiadores_botao_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_contato_canais_exibir_em" AS ENUM('rodape', 'contato', 'kartodromo', 'bks');
  CREATE TYPE "public"."enum_contato_canais_tipo" AS ENUM('whatsapp', 'telefone', 'email', 'outro');
  CREATE TYPE "public"."enum_contato_redes_rede" AS ENUM('instagram', 'youtube', 'facebook', 'tiktok', 'x', 'outra');
  CREATE TYPE "public"."enum_contato_redes_referente" AS ENUM('askart', 'bks');
  CREATE TYPE "public"."enum__contato_v_version_canais_exibir_em" AS ENUM('rodape', 'contato', 'kartodromo', 'bks');
  CREATE TYPE "public"."enum__contato_v_version_canais_tipo" AS ENUM('whatsapp', 'telefone', 'email', 'outro');
  CREATE TYPE "public"."enum__contato_v_version_redes_rede" AS ENUM('instagram', 'youtube', 'facebook', 'tiktok', 'x', 'outra');
  CREATE TYPE "public"."enum__contato_v_version_redes_referente" AS ENUM('askart', 'bks');
  CREATE TYPE "public"."enum_textos_paginas_paginas_rota" AS ENUM('bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__textos_paginas_v_version_paginas_rota" AS ENUM('bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_navegacao_menu_subitens_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_navegacao_menu_subitens_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_navegacao_menu_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_navegacao_menu_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_navegacao_rodape_links_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_navegacao_rodape_links_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum_navegacao_botao_destaque_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum_navegacao_botao_destaque_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__navegacao_v_version_menu_subitens_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__navegacao_v_version_menu_subitens_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__navegacao_v_version_menu_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__navegacao_v_version_menu_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__navegacao_v_version_rodape_links_link_tipo" AS ENUM('interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__navegacao_v_version_rodape_links_link_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TYPE "public"."enum__navegacao_v_version_botao_destaque_tipo" AS ENUM('nenhum', 'interno', 'rota', 'externo');
  CREATE TYPE "public"."enum__navegacao_v_version_botao_destaque_rota" AS ENUM('inicio', 'bks', 'campeonatos', 'classificacao', 'calendario', 'resultados', 'treinos', 'pilotos', 'categorias', 'noticias', 'comunicados', 'eventos', 'galeria', 'documentos', 'historico', 'estatisticas', 'kartodromo', 'sobre', 'contato', 'busca');
  CREATE TABLE "etapas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"temporada_id" integer NOT NULL,
  	"numero" numeric NOT NULL,
  	"nome" varchar,
  	"inicio" timestamp(3) with time zone,
  	"inicio_tz" "enum_etapas_inicio_tz" DEFAULT 'America/Sao_Paulo',
  	"fim" timestamp(3) with time zone,
  	"fim_tz" "enum_etapas_fim_tz" DEFAULT 'America/Sao_Paulo',
  	"status" "enum_etapas_status" DEFAULT 'agendada' NOT NULL,
  	"fator_pontuacao" numeric DEFAULT 1,
  	"local" varchar,
  	"local_mapa" varchar,
  	"link_ingressos" varchar,
  	"descricao" jsonb,
  	"imagem_id" integer,
  	"visibilidade" "enum_etapas_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "etapas_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "corridas_resultados" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"inscricao_id" integer NOT NULL,
  	"posicao_chegada" numeric,
  	"status" "enum_corridas_resultados_status" DEFAULT 'classificado' NOT NULL,
  	"posicao_oficial" numeric,
  	"voltas" numeric,
  	"melhor_volta_ms" numeric,
  	"tempo_total_ms" numeric,
  	"penalidade_tipo" "enum_corridas_resultados_penalidade_tipo",
  	"penalidade_valor" numeric,
  	"penalidade_motivo" varchar,
  	"ajustar_posicao" boolean,
  	"pontos_manuais" numeric,
  	"motivo_ajuste" varchar,
  	"observacao" varchar
  );
  
  CREATE TABLE "corridas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"chave_unica" varchar,
  	"etapa_id" integer NOT NULL,
  	"nome" varchar NOT NULL,
  	"tipo" "enum_corridas_tipo" DEFAULT 'bateria' NOT NULL,
  	"status" "enum_corridas_status" DEFAULT 'rascunho' NOT NULL,
  	"inicio" timestamp(3) with time zone,
  	"inicio_tz" "enum_corridas_inicio_tz" DEFAULT 'America/Sao_Paulo',
  	"voltas_previstas" numeric,
  	"tabela" varchar,
  	"conta_para_classificacao" boolean DEFAULT true,
  	"fator" numeric DEFAULT 1,
  	"volta_mais_rapida_manual_inscricao_id" integer,
  	"volta_mais_rapida_manual_motivo" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "corridas_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "temporada_categorias_ajustes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"inscricao_id" integer NOT NULL,
  	"etapa_id" integer,
  	"tipo" "enum_temporada_categorias_ajustes_tipo" NOT NULL,
  	"pontos" numeric NOT NULL,
  	"motivo" varchar NOT NULL,
  	"documento_id" integer,
  	"registrado_por_id" integer,
  	"registrado_em" timestamp(3) with time zone
  );
  
  CREATE TABLE "temporada_categorias_linhas_manuais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"posicao" numeric,
  	"piloto_id" integer,
  	"numero" numeric,
  	"equipe_id" integer,
  	"pontos" numeric,
  	"vitorias" numeric,
  	"podios" numeric,
  	"corridas" numeric,
  	"observacao" varchar
  );
  
  CREATE TABLE "temporada_categorias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"temporada_id" integer NOT NULL,
  	"categoria_id" integer NOT NULL,
  	"publicada" boolean DEFAULT true,
  	"ordem" numeric,
  	"modo" "enum_temporada_categorias_modo" DEFAULT 'automatico' NOT NULL,
  	"destaque_manual_inscricao_id" integer,
  	"destaque_manual_rotulo" varchar DEFAULT 'Destaque',
  	"destaque_manual_exibir_ate" timestamp(3) with time zone,
  	"regra_id" integer,
  	"campeao_id" integer,
  	"vice_id" integer,
  	"terceiro_id" integer,
  	"fotografia_final" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "temporada_categorias_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "pilotos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"nome_exibicao" varchar,
  	"foto_id" integer,
  	"cidade" varchar,
  	"uf" "enum_pilotos_uf",
  	"biografia" jsonb,
  	"data_nascimento" timestamp(3) with time zone,
  	"autorizacao_imagem_autorizada" "enum_pilotos_autorizacao_imagem_autorizada",
  	"autorizacao_imagem_responsavel" varchar,
  	"autorizacao_imagem_data" timestamp(3) with time zone,
  	"autorizacao_imagem_documento_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_pilotos_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "inscricoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"temporada_id" integer NOT NULL,
  	"categoria_id" integer NOT NULL,
  	"piloto_id" integer NOT NULL,
  	"numero" numeric,
  	"equipe_id" integer,
  	"condicao" "enum_inscricoes_condicao" DEFAULT 'titular' NOT NULL,
  	"status" "enum_inscricoes_status" DEFAULT 'ativa' NOT NULL,
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "equipes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"sigla" varchar,
  	"logo_id" integer,
  	"cidade" varchar,
  	"uf" "enum_equipes_uf",
  	"visibilidade" "enum_equipes_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categorias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"nome" varchar NOT NULL,
  	"sigla" varchar,
  	"slug" varchar,
  	"descricao" jsonb,
  	"imagem_id" integer,
  	"cor" varchar,
  	"visibilidade" "enum_categorias_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "temporadas_formato_etapa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"tipo" "enum_temporadas_formato_etapa_tipo" DEFAULT 'bateria' NOT NULL,
  	"tabela" varchar,
  	"conta_para_classificacao" boolean DEFAULT true,
  	"fator" numeric DEFAULT 1
  );
  
  CREATE TABLE "temporadas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"campeonato_id" integer NOT NULL,
  	"ano" numeric NOT NULL,
  	"nome" varchar,
  	"status" "enum_temporadas_status" DEFAULT 'planejada' NOT NULL,
  	"descricao" jsonb,
  	"logo_id" integer,
  	"banner_id" integer,
  	"regra_id" integer,
  	"fonte_dados" "enum_temporadas_fonte_dados" DEFAULT 'resultados' NOT NULL,
  	"slug" varchar,
  	"visibilidade" "enum_temporadas_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "temporadas_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "campeonatos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"nome" varchar NOT NULL,
  	"sigla" varchar,
  	"temporada_atual_id" integer,
  	"descricao" jsonb,
  	"logo_id" integer,
  	"banner_id" integer,
  	"cores_primaria" varchar,
  	"cores_secundaria" varchar,
  	"cores_destaque" varchar,
  	"historia" jsonb,
  	"regulamento_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_campeonatos_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "regras_pontuacao_tabelas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL
  );
  
  CREATE TABLE "regras_pontuacao_criterios_desempate" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"criterio" "enum_regras_pontuacao_criterios_desempate_criterio" NOT NULL
  );
  
  CREATE TABLE "regras_pontuacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"pontos_pole" numeric,
  	"pontos_volta_rapida" numeric,
  	"pontos_participacao" numeric,
  	"requisito_participacao" "enum_regras_pontuacao_requisito_participacao",
  	"abandono" "enum_regras_pontuacao_abandono" NOT NULL,
  	"percentual_minimo_voltas" numeric,
  	"convidados" "enum_regras_pontuacao_convidados" NOT NULL,
  	"descartes_quantidade" numeric,
  	"descartes_unidade" "enum_regras_pontuacao_descartes_unidade",
  	"descartes_a_partir_de_etapas" numeric,
  	"descartes_ultima_etapa_descartavel" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "regras_pontuacao_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "_regras_pontuacao_v_version_tabelas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_regras_pontuacao_v_version_criterios_desempate" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"criterio" "enum__regras_pontuacao_v_version_criterios_desempate_criterio" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_regras_pontuacao_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_nome" varchar NOT NULL,
  	"version_pontos_pole" numeric,
  	"version_pontos_volta_rapida" numeric,
  	"version_pontos_participacao" numeric,
  	"version_requisito_participacao" "enum__regras_pontuacao_v_version_requisito_participacao",
  	"version_abandono" "enum__regras_pontuacao_v_version_abandono" NOT NULL,
  	"version_percentual_minimo_voltas" numeric,
  	"version_convidados" "enum__regras_pontuacao_v_version_convidados" NOT NULL,
  	"version_descartes_quantidade" numeric,
  	"version_descartes_unidade" "enum__regras_pontuacao_v_version_descartes_unidade",
  	"version_descartes_a_partir_de_etapas" numeric,
  	"version_descartes_ultima_etapa_descartavel" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_regras_pontuacao_v_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "treinos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"data" timestamp(3) with time zone NOT NULL,
  	"status" "enum_treinos_status" DEFAULT 'liberado' NOT NULL,
  	"dia" varchar,
  	"substitui_id" integer,
  	"hora_inicio" "enum_treinos_hora_inicio",
  	"hora_fim" "enum_treinos_hora_fim",
  	"tipo_id" integer,
  	"observacao" varchar,
  	"permitir_sobreposicao" boolean DEFAULT false,
  	"visibilidade" "enum_treinos_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "treinos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "horarios_treino" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"dia_semana" "enum_horarios_treino_dia_semana" NOT NULL,
  	"hora_inicio" "enum_horarios_treino_hora_inicio" NOT NULL,
  	"hora_fim" "enum_horarios_treino_hora_fim" NOT NULL,
  	"tipo_id" integer NOT NULL,
  	"observacao" varchar,
  	"valido_de" timestamp(3) with time zone,
  	"valido_ate" timestamp(3) with time zone,
  	"ordem_na_semana" varchar,
  	"permitir_sobreposicao" boolean DEFAULT false,
  	"visibilidade" "enum_horarios_treino_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "horarios_treino_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "tipos_treino" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"cor" varchar,
  	"descricao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "noticias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"capa_id" integer,
  	"conteudo" jsonb,
  	"subtitulo" varchar,
  	"categoria_id" integer,
  	"autor" varchar,
  	"destaque" boolean DEFAULT false,
  	"galeria_id" integer,
  	"etapa_id" integer,
  	"temporada_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_noticias_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_noticias_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "noticias_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer
  );
  
  CREATE TABLE "_noticias_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_capa_id" integer,
  	"version_conteudo" jsonb,
  	"version_subtitulo" varchar,
  	"version_categoria_id" integer,
  	"version_autor" varchar,
  	"version_destaque" boolean DEFAULT false,
  	"version_galeria_id" integer,
  	"version_etapa_id" integer,
  	"version_temporada_id" integer,
  	"version_slug" varchar,
  	"version_visibilidade" "enum__noticias_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__noticias_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_noticias_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tags_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer
  );
  
  CREATE TABLE "avisos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"tipo" "enum_avisos_tipo" DEFAULT 'comunicado-oficial',
  	"nivel" "enum_avisos_nivel" DEFAULT 'informativo',
  	"texto" jsonb,
  	"destaque" boolean DEFAULT false,
  	"anexo_id" integer,
  	"etapa_id" integer,
  	"treino_id" integer,
  	"visibilidade" "enum_avisos_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"exibir_de" timestamp(3) with time zone,
  	"exibir_ate" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_avisos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_avisos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_tipo" "enum__avisos_v_version_tipo" DEFAULT 'comunicado-oficial',
  	"version_nivel" "enum__avisos_v_version_nivel" DEFAULT 'informativo',
  	"version_texto" jsonb,
  	"version_destaque" boolean DEFAULT false,
  	"version_anexo_id" integer,
  	"version_etapa_id" integer,
  	"version_treino_id" integer,
  	"version_visibilidade" "enum__avisos_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_exibir_de" timestamp(3) with time zone,
  	"version_exibir_ate" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__avisos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "banners" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"titulo" varchar,
  	"texto" varchar,
  	"midia_id" integer,
  	"imagem_celular_id" integer,
  	"video_externo" varchar,
  	"botao_tipo" "enum_banners_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_banners_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"visibilidade" "enum_banners_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"exibir_de" timestamp(3) with time zone,
  	"exibir_ate" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_banners_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "banners_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "_banners_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_titulo" varchar,
  	"version_texto" varchar,
  	"version_midia_id" integer,
  	"version_imagem_celular_id" integer,
  	"version_video_externo" varchar,
  	"version_botao_tipo" "enum__banners_v_version_botao_tipo" DEFAULT 'nenhum',
  	"version_botao_rota" "enum__banners_v_version_botao_rota",
  	"version_botao_url" varchar,
  	"version_botao_rotulo" varchar,
  	"version_botao_nova_aba" boolean DEFAULT false,
  	"version_visibilidade" "enum__banners_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_exibir_de" timestamp(3) with time zone,
  	"version_exibir_ate" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__banners_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_banners_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "galerias" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"titulo" varchar,
  	"capa_id" integer,
  	"exibicao" "enum_galerias_exibicao" DEFAULT 'grade',
  	"tipo" "enum_galerias_tipo",
  	"data" timestamp(3) with time zone,
  	"descricao" varchar,
  	"etapa_id" integer,
  	"temporada_id" integer,
  	"campeonato_id" integer,
  	"noticia_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_galerias_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_galerias_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "galerias_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"midia_id" integer,
  	"pilotos_id" integer,
  	"categorias_id" integer
  );
  
  CREATE TABLE "_galerias_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_titulo" varchar,
  	"version_capa_id" integer,
  	"version_exibicao" "enum__galerias_v_version_exibicao" DEFAULT 'grade',
  	"version_tipo" "enum__galerias_v_version_tipo",
  	"version_data" timestamp(3) with time zone,
  	"version_descricao" varchar,
  	"version_etapa_id" integer,
  	"version_temporada_id" integer,
  	"version_campeonato_id" integer,
  	"version_noticia_id" integer,
  	"version_slug" varchar,
  	"version_visibilidade" "enum__galerias_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__galerias_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_galerias_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"midia_id" integer,
  	"pilotos_id" integer,
  	"categorias_id" integer
  );
  
  CREATE TABLE "midia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"legenda" varchar,
  	"credito" varchar,
  	"capa_do_video_id" integer,
  	"titulo" varchar,
  	"enviado_por_id" integer,
  	"folder_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_miniatura_url" varchar,
  	"sizes_miniatura_width" numeric,
  	"sizes_miniatura_height" numeric,
  	"sizes_miniatura_mime_type" varchar,
  	"sizes_miniatura_filesize" numeric,
  	"sizes_miniatura_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_destaque_url" varchar,
  	"sizes_destaque_width" numeric,
  	"sizes_destaque_height" numeric,
  	"sizes_destaque_mime_type" varchar,
  	"sizes_destaque_filesize" numeric,
  	"sizes_destaque_filename" varchar,
  	"sizes_compartilhamento_url" varchar,
  	"sizes_compartilhamento_width" numeric,
  	"sizes_compartilhamento_height" numeric,
  	"sizes_compartilhamento_mime_type" varchar,
  	"sizes_compartilhamento_filesize" numeric,
  	"sizes_compartilhamento_filename" varchar
  );
  
  CREATE TABLE "midia_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pilotos_id" integer
  );
  
  CREATE TABLE "documentos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"titulo" varchar,
  	"tipo_id" integer,
  	"revisao" varchar,
  	"vigente_desde" timestamp(3) with time zone,
  	"descricao" varchar,
  	"substitui_id" integer,
  	"campeonato_id" integer,
  	"temporada_id" integer,
  	"categoria_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_documentos_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_documentos_status" DEFAULT 'draft',
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "_documentos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_titulo" varchar,
  	"version_tipo_id" integer,
  	"version_revisao" varchar,
  	"version_vigente_desde" timestamp(3) with time zone,
  	"version_descricao" varchar,
  	"version_substitui_id" integer,
  	"version_campeonato_id" integer,
  	"version_temporada_id" integer,
  	"version_categoria_id" integer,
  	"version_slug" varchar,
  	"version_visibilidade" "enum__documentos_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__documentos_v_version_status" DEFAULT 'draft',
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "eventos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar,
  	"inicio" timestamp(3) with time zone,
  	"inicio_tz" "enum_eventos_inicio_tz" DEFAULT 'America/Sao_Paulo',
  	"fim" timestamp(3) with time zone,
  	"fim_tz" "enum_eventos_fim_tz" DEFAULT 'America/Sao_Paulo',
  	"local" varchar,
  	"imagem_id" integer,
  	"descricao" jsonb,
  	"link_inscricao" varchar,
  	"slug" varchar,
  	"visibilidade" "enum_eventos_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_eventos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "eventos_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "_eventos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_inicio" timestamp(3) with time zone,
  	"version_inicio_tz" "enum__eventos_v_version_inicio_tz" DEFAULT 'America/Sao_Paulo',
  	"version_fim" timestamp(3) with time zone,
  	"version_fim_tz" "enum__eventos_v_version_fim_tz" DEFAULT 'America/Sao_Paulo',
  	"version_local" varchar,
  	"version_imagem_id" integer,
  	"version_descricao" jsonb,
  	"version_link_inscricao" varchar,
  	"version_slug" varchar,
  	"version_visibilidade" "enum__eventos_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__eventos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_eventos_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "paginas_blocks_texto" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_imagem" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"imagem_id" integer,
  	"legenda" varchar,
  	"largura" "enum_paginas_blocks_imagem_largura" DEFAULT 'texto',
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_galeria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"galeria_id" integer,
  	"exibicao" "enum_paginas_blocks_galeria_exibicao" DEFAULT 'padrao',
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_botao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_tipo" "enum_paginas_blocks_botao_link_tipo" DEFAULT 'interno',
  	"link_rota" "enum_paginas_blocks_botao_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"legenda" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas_blocks_documento" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"documento_id" integer,
  	"texto" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "paginas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"titulo" varchar,
  	"resumo" varchar,
  	"imagem_topo_id" integer,
  	"slug" varchar,
  	"visibilidade" "enum_paginas_visibilidade" DEFAULT 'visivel',
  	"publicar_em" timestamp(3) with time zone,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
  	"_status" "enum_paginas_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "paginas_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "_paginas_v_blocks_texto" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"texto" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_imagem" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"imagem_id" integer,
  	"legenda" varchar,
  	"largura" "enum__paginas_v_blocks_imagem_largura" DEFAULT 'texto',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_galeria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"galeria_id" integer,
  	"exibicao" "enum__paginas_v_blocks_galeria_exibicao" DEFAULT 'padrao',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_botao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_tipo" "enum__paginas_v_blocks_botao_link_tipo" DEFAULT 'interno',
  	"link_rota" "enum__paginas_v_blocks_botao_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"legenda" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v_blocks_documento" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"documento_id" integer,
  	"texto" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_paginas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_titulo" varchar,
  	"version_resumo" varchar,
  	"version_imagem_topo_id" integer,
  	"version_slug" varchar,
  	"version_visibilidade" "enum__paginas_v_version_visibilidade" DEFAULT 'visivel',
  	"version_publicar_em" timestamp(3) with time zone,
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__paginas_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_paginas_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "perguntas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"pergunta" varchar NOT NULL,
  	"resposta" jsonb NOT NULL,
  	"secao" "enum_perguntas_secao" DEFAULT 'kartodromo' NOT NULL,
  	"visibilidade" "enum_perguntas_visibilidade" DEFAULT 'visivel' NOT NULL,
  	"texto_busca" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "categorias_noticia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cor" varchar,
  	"descricao" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tags" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "tipos_documento" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"nome" varchar NOT NULL,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "usuarios_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "usuarios" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"papel" "enum_usuarios_papel" DEFAULT 'colaborador' NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "atividades" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"usuario_id" integer,
  	"acao" "enum_atividades_acao" NOT NULL,
  	"onde" varchar NOT NULL,
  	"colecao" varchar,
  	"documento" varchar,
  	"resumo" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_folders_folder_type" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_payload_folders_folder_type",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload_folders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"folder_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"etapas_id" integer,
  	"corridas_id" integer,
  	"temporada_categorias_id" integer,
  	"pilotos_id" integer,
  	"inscricoes_id" integer,
  	"equipes_id" integer,
  	"categorias_id" integer,
  	"temporadas_id" integer,
  	"campeonatos_id" integer,
  	"regras_pontuacao_id" integer,
  	"treinos_id" integer,
  	"horarios_treino_id" integer,
  	"tipos_treino_id" integer,
  	"noticias_id" integer,
  	"avisos_id" integer,
  	"banners_id" integer,
  	"galerias_id" integer,
  	"midia_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer,
  	"paginas_id" integer,
  	"perguntas_id" integer,
  	"categorias_noticia_id" integer,
  	"tags_id" integer,
  	"tipos_documento_id" integer,
  	"usuarios_id" integer,
  	"atividades_id" integer,
  	"payload_folders_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"usuarios_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pagina_inicial_topo_botoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_tipo" "enum_pagina_inicial_topo_botoes_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum_pagina_inicial_topo_botoes_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false
  );
  
  CREATE TABLE "pagina_inicial_blocks_proxima_etapa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_proxima_etapa_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_proxima_etapa_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"contagem" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_lideres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_lideres_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_lideres_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 6,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_calendario" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_calendario_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_calendario_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_treinos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_treinos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_treinos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_noticias" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_noticias_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_noticias_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_comunicados" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_comunicados_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_comunicados_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 3,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_pilotos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_pilotos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_pilotos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_galeria_destaque" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_galeria_destaque_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_galeria_destaque_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"galeria_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_kartodromo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_kartodromo_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_kartodromo_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_ingressos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_ingressos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_ingressos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_perguntas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_perguntas_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_perguntas_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 5,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_contato" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_contato_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_contato_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_apoiadores_apoiadores" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"logo_id" integer NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "pagina_inicial_blocks_apoiadores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum_pagina_inicial_blocks_apoiadores_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum_pagina_inicial_blocks_apoiadores_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pagina_inicial" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"topo_titulo" varchar,
  	"topo_subtitulo" varchar,
  	"topo_imagem_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "pagina_inicial_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "_pagina_inicial_v_version_topo_botoes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_tipo" "enum__pagina_inicial_v_version_topo_botoes_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum__pagina_inicial_v_version_topo_botoes_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_proxima_etapa" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_proxima_etapa_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_proxima_etapa_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"contagem" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_lideres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_lideres_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_lideres_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 6,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_calendario" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_calendario_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_calendario_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_treinos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_treinos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_treinos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_noticias" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_noticias_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_noticias_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_comunicados" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_comunicados_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_comunicados_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 3,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_pilotos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_pilotos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_pilotos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_galeria_destaque" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_galeria_destaque_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_galeria_destaque_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"galeria_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_kartodromo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_kartodromo_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_kartodromo_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_ingressos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_ingressos_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_ingressos_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_perguntas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_perguntas_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_perguntas_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"quantidade" numeric DEFAULT 5,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_contato" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_contato_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_contato_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"logo_id" integer NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v_blocks_apoiadores" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativo" boolean DEFAULT true,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"botao_tipo" "enum__pagina_inicial_v_blocks_apoiadores_botao_tipo" DEFAULT 'nenhum',
  	"botao_rota" "enum__pagina_inicial_v_blocks_apoiadores_botao_rota",
  	"botao_url" varchar,
  	"botao_rotulo" varchar,
  	"botao_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pagina_inicial_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_topo_titulo" varchar,
  	"version_topo_subtitulo" varchar,
  	"version_topo_imagem_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_pagina_inicial_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "kartodromo_taxas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL,
  	"valor" numeric,
  	"a_confirmar" boolean DEFAULT true,
  	"obrigatoria" boolean DEFAULT false,
  	"observacao" varchar
  );
  
  CREATE TABLE "kartodromo_como_treinar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar
  );
  
  CREATE TABLE "kartodromo_estrutura" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar,
  	"imagem_id" integer
  );
  
  CREATE TABLE "kartodromo_dados_pista" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rotulo" varchar NOT NULL,
  	"valor" varchar NOT NULL
  );
  
  CREATE TABLE "kartodromo" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar DEFAULT 'Kartódromo Ayrton Senna do Guará' NOT NULL,
  	"resumo" varchar,
  	"imagem_topo_id" integer,
  	"historia" jsonb,
  	"taxas_introducao" varchar DEFAULT 'Para correr no kartódromo é obrigatório pagar a taxa de pista e a taxa de ambulância.',
  	"como_treinar_introducao" jsonb,
  	"tracado_id" integer,
  	"info_pilotos" jsonb,
  	"info_visitantes" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "kartodromo_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"galerias_id" integer
  );
  
  CREATE TABLE "_kartodromo_v_version_taxas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL,
  	"valor" numeric,
  	"a_confirmar" boolean DEFAULT true,
  	"obrigatoria" boolean DEFAULT false,
  	"observacao" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kartodromo_v_version_como_treinar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kartodromo_v_version_estrutura" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar,
  	"imagem_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kartodromo_v_version_dados_pista" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rotulo" varchar NOT NULL,
  	"valor" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kartodromo_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_nome" varchar DEFAULT 'Kartódromo Ayrton Senna do Guará' NOT NULL,
  	"version_resumo" varchar,
  	"version_imagem_topo_id" integer,
  	"version_historia" jsonb,
  	"version_taxas_introducao" varchar DEFAULT 'Para correr no kartódromo é obrigatório pagar a taxa de pista e a taxa de ambulância.',
  	"version_como_treinar_introducao" jsonb,
  	"version_tracado_id" integer,
  	"version_info_pilotos" jsonb,
  	"version_info_visitantes" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_kartodromo_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"galerias_id" integer
  );
  
  CREATE TABLE "contato_canais_exibir_em" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_contato_canais_exibir_em",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "contato_canais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tipo" "enum_contato_canais_tipo" DEFAULT 'whatsapp' NOT NULL,
  	"rotulo" varchar,
  	"valor" varchar NOT NULL,
  	"observacao" varchar,
  	"provisorio" boolean DEFAULT false
  );
  
  CREATE TABLE "contato_horarios" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dias" varchar NOT NULL,
  	"horario" varchar NOT NULL
  );
  
  CREATE TABLE "contato_redes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rede" "enum_contato_redes_rede" DEFAULT 'instagram' NOT NULL,
  	"usuario" varchar,
  	"url" varchar NOT NULL,
  	"referente" "enum_contato_redes_referente" DEFAULT 'askart'
  );
  
  CREATE TABLE "contato" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"endereco_texto" varchar,
  	"endereco_link_mapa" varchar,
  	"endereco_imagem_mapa_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_contato_v_version_canais_exibir_em" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__contato_v_version_canais_exibir_em",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_contato_v_version_canais" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tipo" "enum__contato_v_version_canais_tipo" DEFAULT 'whatsapp' NOT NULL,
  	"rotulo" varchar,
  	"valor" varchar NOT NULL,
  	"observacao" varchar,
  	"provisorio" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contato_v_version_horarios" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"dias" varchar NOT NULL,
  	"horario" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contato_v_version_redes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rede" "enum__contato_v_version_redes_rede" DEFAULT 'instagram' NOT NULL,
  	"usuario" varchar,
  	"url" varchar NOT NULL,
  	"referente" "enum__contato_v_version_redes_referente" DEFAULT 'askart',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_contato_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_endereco_texto" varchar,
  	"version_endereco_link_mapa" varchar,
  	"version_endereco_imagem_mapa_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "institucional_pilares" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar NOT NULL
  );
  
  CREATE TABLE "institucional_marcos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ano" numeric NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar
  );
  
  CREATE TABLE "institucional_diretoria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cargo" varchar NOT NULL,
  	"foto_id" integer
  );
  
  CREATE TABLE "institucional" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"resumo" varchar,
  	"imagem_topo_id" integer,
  	"sobre" jsonb,
  	"historia" jsonb,
  	"galeria_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "institucional_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documentos_id" integer
  );
  
  CREATE TABLE "_institucional_v_version_pilares" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_institucional_v_version_marcos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ano" numeric NOT NULL,
  	"titulo" varchar NOT NULL,
  	"texto" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_institucional_v_version_diretoria" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"cargo" varchar NOT NULL,
  	"foto_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_institucional_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_resumo" varchar,
  	"version_imagem_topo_id" integer,
  	"version_sobre" jsonb,
  	"version_historia" jsonb,
  	"version_galeria_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_institucional_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documentos_id" integer
  );
  
  CREATE TABLE "textos_paginas_paginas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rota" "enum_textos_paginas_paginas_rota" NOT NULL,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"introducao" varchar,
  	"imagem_id" integer,
  	"texto_vazio" varchar,
  	"seo_titulo" varchar,
  	"seo_descricao" varchar
  );
  
  CREATE TABLE "textos_paginas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_textos_paginas_v_version_paginas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rota" "enum__textos_paginas_v_version_paginas_rota" NOT NULL,
  	"titulo" varchar,
  	"subtitulo" varchar,
  	"introducao" varchar,
  	"imagem_id" integer,
  	"texto_vazio" varchar,
  	"seo_titulo" varchar,
  	"seo_descricao" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_textos_paginas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "navegacao_menu_subitens" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_tipo" "enum_navegacao_menu_subitens_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum_navegacao_menu_subitens_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false
  );
  
  CREATE TABLE "navegacao_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_tipo" "enum_navegacao_menu_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum_navegacao_menu_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false
  );
  
  CREATE TABLE "navegacao_rodape_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_tipo" "enum_navegacao_rodape_links_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum_navegacao_rodape_links_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false
  );
  
  CREATE TABLE "navegacao_rodape" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL
  );
  
  CREATE TABLE "navegacao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"botao_destaque_tipo" "enum_navegacao_botao_destaque_tipo" DEFAULT 'nenhum',
  	"botao_destaque_rota" "enum_navegacao_botao_destaque_rota",
  	"botao_destaque_url" varchar,
  	"botao_destaque_rotulo" varchar,
  	"botao_destaque_nova_aba" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "navegacao_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "_navegacao_v_version_menu_subitens" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_tipo" "enum__navegacao_v_version_menu_subitens_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum__navegacao_v_version_menu_subitens_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navegacao_v_version_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_tipo" "enum__navegacao_v_version_menu_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum__navegacao_v_version_menu_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navegacao_v_version_rodape_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_tipo" "enum__navegacao_v_version_rodape_links_link_tipo" DEFAULT 'interno' NOT NULL,
  	"link_rota" "enum__navegacao_v_version_rodape_links_link_rota",
  	"link_url" varchar,
  	"link_rotulo" varchar,
  	"link_nova_aba" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navegacao_v_version_rodape" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"titulo" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_navegacao_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_botao_destaque_tipo" "enum__navegacao_v_version_botao_destaque_tipo" DEFAULT 'nenhum',
  	"version_botao_destaque_rota" "enum__navegacao_v_version_botao_destaque_rota",
  	"version_botao_destaque_url" varchar,
  	"version_botao_destaque_rotulo" varchar,
  	"version_botao_destaque_nova_aba" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_navegacao_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"paginas_id" integer,
  	"noticias_id" integer,
  	"etapas_id" integer,
  	"temporadas_id" integer,
  	"categorias_id" integer,
  	"pilotos_id" integer,
  	"galerias_id" integer,
  	"documentos_id" integer,
  	"eventos_id" integer
  );
  
  CREATE TABLE "configuracoes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar DEFAULT 'Associação de Kart de Brasília' NOT NULL,
  	"sigla" varchar DEFAULT 'ASKART' NOT NULL,
  	"descricao" varchar,
  	"logo_id" integer,
  	"logo_fundo_escuro_id" integer,
  	"favicon_id" integer,
  	"cor_primaria" varchar,
  	"cor_secundaria" varchar,
  	"cor_escura" varchar,
  	"campeonato_principal_id" integer,
  	"izy_pass" varchar,
  	"izy_pass_texto" varchar DEFAULT 'Comprar na IZY Pass',
  	"texto_rodape" varchar,
  	"titulo_site" varchar,
  	"imagem_compartilhamento_id" integer,
  	"faixa_demonstracao" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_configuracoes_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_nome" varchar DEFAULT 'Associação de Kart de Brasília' NOT NULL,
  	"version_sigla" varchar DEFAULT 'ASKART' NOT NULL,
  	"version_descricao" varchar,
  	"version_logo_id" integer,
  	"version_logo_fundo_escuro_id" integer,
  	"version_favicon_id" integer,
  	"version_cor_primaria" varchar,
  	"version_cor_secundaria" varchar,
  	"version_cor_escura" varchar,
  	"version_campeonato_principal_id" integer,
  	"version_izy_pass" varchar,
  	"version_izy_pass_texto" varchar DEFAULT 'Comprar na IZY Pass',
  	"version_texto_rodape" varchar,
  	"version_titulo_site" varchar,
  	"version_imagem_compartilhamento_id" integer,
  	"version_faixa_demonstracao" boolean DEFAULT false,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "etapas" ADD CONSTRAINT "etapas_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "etapas" ADD CONSTRAINT "etapas_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "etapas_rels" ADD CONSTRAINT "etapas_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "etapas_rels" ADD CONSTRAINT "etapas_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corridas_resultados" ADD CONSTRAINT "corridas_resultados_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "corridas_resultados" ADD CONSTRAINT "corridas_resultados_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."corridas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corridas" ADD CONSTRAINT "corridas_etapa_id_etapas_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "corridas" ADD CONSTRAINT "corridas_volta_mais_rapida_manual_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("volta_mais_rapida_manual_inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "corridas_rels" ADD CONSTRAINT "corridas_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."corridas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "corridas_rels" ADD CONSTRAINT "corridas_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporada_categorias_ajustes" ADD CONSTRAINT "temporada_categorias_ajustes_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_ajustes" ADD CONSTRAINT "temporada_categorias_ajustes_etapa_id_etapas_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_ajustes" ADD CONSTRAINT "temporada_categorias_ajustes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_ajustes" ADD CONSTRAINT "temporada_categorias_ajustes_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_ajustes" ADD CONSTRAINT "temporada_categorias_ajustes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."temporada_categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporada_categorias_linhas_manuais" ADD CONSTRAINT "temporada_categorias_linhas_manuais_piloto_id_pilotos_id_fk" FOREIGN KEY ("piloto_id") REFERENCES "public"."pilotos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_linhas_manuais" ADD CONSTRAINT "temporada_categorias_linhas_manuais_equipe_id_equipes_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_linhas_manuais" ADD CONSTRAINT "temporada_categorias_linhas_manuais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."temporada_categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_destaque_manual_inscricao_id_inscricoes_id_fk" FOREIGN KEY ("destaque_manual_inscricao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_regra_id_regras_pontuacao_id_fk" FOREIGN KEY ("regra_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_campeao_id_inscricoes_id_fk" FOREIGN KEY ("campeao_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_vice_id_inscricoes_id_fk" FOREIGN KEY ("vice_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias" ADD CONSTRAINT "temporada_categorias_terceiro_id_inscricoes_id_fk" FOREIGN KEY ("terceiro_id") REFERENCES "public"."inscricoes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporada_categorias_rels" ADD CONSTRAINT "temporada_categorias_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."temporada_categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporada_categorias_rels" ADD CONSTRAINT "temporada_categorias_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pilotos" ADD CONSTRAINT "pilotos_foto_id_midia_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pilotos" ADD CONSTRAINT "pilotos_autorizacao_imagem_documento_id_documentos_id_fk" FOREIGN KEY ("autorizacao_imagem_documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_piloto_id_pilotos_id_fk" FOREIGN KEY ("piloto_id") REFERENCES "public"."pilotos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inscricoes" ADD CONSTRAINT "inscricoes_equipe_id_equipes_id_fk" FOREIGN KEY ("equipe_id") REFERENCES "public"."equipes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "equipes" ADD CONSTRAINT "equipes_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categorias" ADD CONSTRAINT "categorias_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporadas_formato_etapa" ADD CONSTRAINT "temporadas_formato_etapa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_campeonato_id_campeonatos_id_fk" FOREIGN KEY ("campeonato_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_banner_id_midia_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporadas" ADD CONSTRAINT "temporadas_regra_id_regras_pontuacao_id_fk" FOREIGN KEY ("regra_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "temporadas_rels" ADD CONSTRAINT "temporadas_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "temporadas_rels" ADD CONSTRAINT "temporadas_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_temporada_atual_id_temporadas_id_fk" FOREIGN KEY ("temporada_atual_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_banner_id_midia_id_fk" FOREIGN KEY ("banner_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "campeonatos" ADD CONSTRAINT "campeonatos_regulamento_id_documentos_id_fk" FOREIGN KEY ("regulamento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "regras_pontuacao_tabelas" ADD CONSTRAINT "regras_pontuacao_tabelas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "regras_pontuacao_criterios_desempate" ADD CONSTRAINT "regras_pontuacao_criterios_desempate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "regras_pontuacao_numbers" ADD CONSTRAINT "regras_pontuacao_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_regras_pontuacao_v_version_tabelas" ADD CONSTRAINT "_regras_pontuacao_v_version_tabelas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_regras_pontuacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_regras_pontuacao_v_version_criterios_desempate" ADD CONSTRAINT "_regras_pontuacao_v_version_criterios_desempate_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_regras_pontuacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_regras_pontuacao_v" ADD CONSTRAINT "_regras_pontuacao_v_parent_id_regras_pontuacao_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_regras_pontuacao_v_numbers" ADD CONSTRAINT "_regras_pontuacao_v_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_regras_pontuacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treinos" ADD CONSTRAINT "treinos_substitui_id_horarios_treino_id_fk" FOREIGN KEY ("substitui_id") REFERENCES "public"."horarios_treino"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treinos" ADD CONSTRAINT "treinos_tipo_id_tipos_treino_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_treino"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treinos_rels" ADD CONSTRAINT "treinos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."treinos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treinos_rels" ADD CONSTRAINT "treinos_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "horarios_treino" ADD CONSTRAINT "horarios_treino_tipo_id_tipos_treino_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_treino"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "horarios_treino_rels" ADD CONSTRAINT "horarios_treino_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."horarios_treino"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "horarios_treino_rels" ADD CONSTRAINT "horarios_treino_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_capa_id_midia_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_categoria_id_categorias_noticia_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_noticia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_etapa_id_etapas_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias" ADD CONSTRAINT "noticias_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "noticias_rels" ADD CONSTRAINT "noticias_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_rels" ADD CONSTRAINT "noticias_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_rels" ADD CONSTRAINT "noticias_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "noticias_rels" ADD CONSTRAINT "noticias_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_parent_id_noticias_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_capa_id_midia_id_fk" FOREIGN KEY ("version_capa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_categoria_id_categorias_noticia_id_fk" FOREIGN KEY ("version_categoria_id") REFERENCES "public"."categorias_noticia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_galeria_id_galerias_id_fk" FOREIGN KEY ("version_galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_etapa_id_etapas_id_fk" FOREIGN KEY ("version_etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v" ADD CONSTRAINT "_noticias_v_version_temporada_id_temporadas_id_fk" FOREIGN KEY ("version_temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_noticias_v_rels" ADD CONSTRAINT "_noticias_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_noticias_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v_rels" ADD CONSTRAINT "_noticias_v_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v_rels" ADD CONSTRAINT "_noticias_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_noticias_v_rels" ADD CONSTRAINT "_noticias_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "avisos" ADD CONSTRAINT "avisos_anexo_id_documentos_id_fk" FOREIGN KEY ("anexo_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avisos" ADD CONSTRAINT "avisos_etapa_id_etapas_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "avisos" ADD CONSTRAINT "avisos_treino_id_treinos_id_fk" FOREIGN KEY ("treino_id") REFERENCES "public"."treinos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_avisos_v" ADD CONSTRAINT "_avisos_v_parent_id_avisos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."avisos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_avisos_v" ADD CONSTRAINT "_avisos_v_version_anexo_id_documentos_id_fk" FOREIGN KEY ("version_anexo_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_avisos_v" ADD CONSTRAINT "_avisos_v_version_etapa_id_etapas_id_fk" FOREIGN KEY ("version_etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_avisos_v" ADD CONSTRAINT "_avisos_v_version_treino_id_treinos_id_fk" FOREIGN KEY ("version_treino_id") REFERENCES "public"."treinos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners" ADD CONSTRAINT "banners_midia_id_midia_id_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners" ADD CONSTRAINT "banners_imagem_celular_id_midia_id_fk" FOREIGN KEY ("imagem_celular_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "banners_rels" ADD CONSTRAINT "banners_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v" ADD CONSTRAINT "_banners_v_parent_id_banners_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."banners"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_banners_v" ADD CONSTRAINT "_banners_v_version_midia_id_midia_id_fk" FOREIGN KEY ("version_midia_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_banners_v" ADD CONSTRAINT "_banners_v_version_imagem_celular_id_midia_id_fk" FOREIGN KEY ("version_imagem_celular_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_banners_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_banners_v_rels" ADD CONSTRAINT "_banners_v_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galerias" ADD CONSTRAINT "galerias_capa_id_midia_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galerias" ADD CONSTRAINT "galerias_etapa_id_etapas_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galerias" ADD CONSTRAINT "galerias_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galerias" ADD CONSTRAINT "galerias_campeonato_id_campeonatos_id_fk" FOREIGN KEY ("campeonato_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galerias" ADD CONSTRAINT "galerias_noticia_id_noticias_id_fk" FOREIGN KEY ("noticia_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "galerias_rels" ADD CONSTRAINT "galerias_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galerias_rels" ADD CONSTRAINT "galerias_rels_midia_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galerias_rels" ADD CONSTRAINT "galerias_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "galerias_rels" ADD CONSTRAINT "galerias_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_parent_id_galerias_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_version_capa_id_midia_id_fk" FOREIGN KEY ("version_capa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_version_etapa_id_etapas_id_fk" FOREIGN KEY ("version_etapa_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_version_temporada_id_temporadas_id_fk" FOREIGN KEY ("version_temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_version_campeonato_id_campeonatos_id_fk" FOREIGN KEY ("version_campeonato_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v" ADD CONSTRAINT "_galerias_v_version_noticia_id_noticias_id_fk" FOREIGN KEY ("version_noticia_id") REFERENCES "public"."noticias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_galerias_v_rels" ADD CONSTRAINT "_galerias_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_galerias_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galerias_v_rels" ADD CONSTRAINT "_galerias_v_rels_midia_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galerias_v_rels" ADD CONSTRAINT "_galerias_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_galerias_v_rels" ADD CONSTRAINT "_galerias_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "midia" ADD CONSTRAINT "midia_capa_do_video_id_midia_id_fk" FOREIGN KEY ("capa_do_video_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "midia" ADD CONSTRAINT "midia_enviado_por_id_usuarios_id_fk" FOREIGN KEY ("enviado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "midia" ADD CONSTRAINT "midia_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "midia_rels" ADD CONSTRAINT "midia_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."midia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "midia_rels" ADD CONSTRAINT "midia_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tipo_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_id") REFERENCES "public"."tipos_documento"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documentos" ADD CONSTRAINT "documentos_substitui_id_documentos_id_fk" FOREIGN KEY ("substitui_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documentos" ADD CONSTRAINT "documentos_campeonato_id_campeonatos_id_fk" FOREIGN KEY ("campeonato_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documentos" ADD CONSTRAINT "documentos_temporada_id_temporadas_id_fk" FOREIGN KEY ("temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "documentos" ADD CONSTRAINT "documentos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_parent_id_documentos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_version_tipo_id_tipos_documento_id_fk" FOREIGN KEY ("version_tipo_id") REFERENCES "public"."tipos_documento"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_version_substitui_id_documentos_id_fk" FOREIGN KEY ("version_substitui_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_version_campeonato_id_campeonatos_id_fk" FOREIGN KEY ("version_campeonato_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_version_temporada_id_temporadas_id_fk" FOREIGN KEY ("version_temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documentos_v" ADD CONSTRAINT "_documentos_v_version_categoria_id_categorias_id_fk" FOREIGN KEY ("version_categoria_id") REFERENCES "public"."categorias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "eventos" ADD CONSTRAINT "eventos_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "eventos_rels" ADD CONSTRAINT "eventos_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "eventos_rels" ADD CONSTRAINT "eventos_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v" ADD CONSTRAINT "_eventos_v_parent_id_eventos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."eventos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_eventos_v" ADD CONSTRAINT "_eventos_v_version_imagem_id_midia_id_fk" FOREIGN KEY ("version_imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_eventos_v_rels" ADD CONSTRAINT "_eventos_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_eventos_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_eventos_v_rels" ADD CONSTRAINT "_eventos_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_texto" ADD CONSTRAINT "paginas_blocks_texto_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_imagem" ADD CONSTRAINT "paginas_blocks_imagem_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_imagem" ADD CONSTRAINT "paginas_blocks_imagem_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_galeria" ADD CONSTRAINT "paginas_blocks_galeria_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_galeria" ADD CONSTRAINT "paginas_blocks_galeria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_botao" ADD CONSTRAINT "paginas_blocks_botao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_video" ADD CONSTRAINT "paginas_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_blocks_documento" ADD CONSTRAINT "paginas_blocks_documento_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_blocks_documento" ADD CONSTRAINT "paginas_blocks_documento_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas" ADD CONSTRAINT "paginas_imagem_topo_id_midia_id_fk" FOREIGN KEY ("imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "paginas_rels" ADD CONSTRAINT "paginas_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_texto" ADD CONSTRAINT "_paginas_v_blocks_texto_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_imagem" ADD CONSTRAINT "_paginas_v_blocks_imagem_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_imagem" ADD CONSTRAINT "_paginas_v_blocks_imagem_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_galeria" ADD CONSTRAINT "_paginas_v_blocks_galeria_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_galeria" ADD CONSTRAINT "_paginas_v_blocks_galeria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_botao" ADD CONSTRAINT "_paginas_v_blocks_botao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_video" ADD CONSTRAINT "_paginas_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_documento" ADD CONSTRAINT "_paginas_v_blocks_documento_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_blocks_documento" ADD CONSTRAINT "_paginas_v_blocks_documento_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v" ADD CONSTRAINT "_paginas_v_parent_id_paginas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."paginas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v" ADD CONSTRAINT "_paginas_v_version_imagem_topo_id_midia_id_fk" FOREIGN KEY ("version_imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_paginas_v_rels" ADD CONSTRAINT "_paginas_v_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "usuarios_sessions" ADD CONSTRAINT "usuarios_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "atividades" ADD CONSTRAINT "atividades_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_folders_folder_type" ADD CONSTRAINT "payload_folders_folder_type_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_folders" ADD CONSTRAINT "payload_folders_folder_id_payload_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_corridas_fk" FOREIGN KEY ("corridas_id") REFERENCES "public"."corridas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_temporada_categorias_fk" FOREIGN KEY ("temporada_categorias_id") REFERENCES "public"."temporada_categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inscricoes_fk" FOREIGN KEY ("inscricoes_id") REFERENCES "public"."inscricoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_equipes_fk" FOREIGN KEY ("equipes_id") REFERENCES "public"."equipes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_campeonatos_fk" FOREIGN KEY ("campeonatos_id") REFERENCES "public"."campeonatos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_regras_pontuacao_fk" FOREIGN KEY ("regras_pontuacao_id") REFERENCES "public"."regras_pontuacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_treinos_fk" FOREIGN KEY ("treinos_id") REFERENCES "public"."treinos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_horarios_treino_fk" FOREIGN KEY ("horarios_treino_id") REFERENCES "public"."horarios_treino"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tipos_treino_fk" FOREIGN KEY ("tipos_treino_id") REFERENCES "public"."tipos_treino"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_avisos_fk" FOREIGN KEY ("avisos_id") REFERENCES "public"."avisos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_banners_fk" FOREIGN KEY ("banners_id") REFERENCES "public"."banners"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_midia_fk" FOREIGN KEY ("midia_id") REFERENCES "public"."midia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_perguntas_fk" FOREIGN KEY ("perguntas_id") REFERENCES "public"."perguntas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categorias_noticia_fk" FOREIGN KEY ("categorias_noticia_id") REFERENCES "public"."categorias_noticia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tags_fk" FOREIGN KEY ("tags_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tipos_documento_fk" FOREIGN KEY ("tipos_documento_id") REFERENCES "public"."tipos_documento"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_usuarios_fk" FOREIGN KEY ("usuarios_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_atividades_fk" FOREIGN KEY ("atividades_id") REFERENCES "public"."atividades"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payload_folders_fk" FOREIGN KEY ("payload_folders_id") REFERENCES "public"."payload_folders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_usuarios_fk" FOREIGN KEY ("usuarios_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_topo_botoes" ADD CONSTRAINT "pagina_inicial_topo_botoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_proxima_etapa" ADD CONSTRAINT "pagina_inicial_blocks_proxima_etapa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_lideres" ADD CONSTRAINT "pagina_inicial_blocks_lideres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_calendario" ADD CONSTRAINT "pagina_inicial_blocks_calendario_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_treinos" ADD CONSTRAINT "pagina_inicial_blocks_treinos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_noticias" ADD CONSTRAINT "pagina_inicial_blocks_noticias_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_comunicados" ADD CONSTRAINT "pagina_inicial_blocks_comunicados_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_pilotos" ADD CONSTRAINT "pagina_inicial_blocks_pilotos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_galeria_destaque" ADD CONSTRAINT "pagina_inicial_blocks_galeria_destaque_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_galeria_destaque" ADD CONSTRAINT "pagina_inicial_blocks_galeria_destaque_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_kartodromo" ADD CONSTRAINT "pagina_inicial_blocks_kartodromo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_ingressos" ADD CONSTRAINT "pagina_inicial_blocks_ingressos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_perguntas" ADD CONSTRAINT "pagina_inicial_blocks_perguntas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_contato" ADD CONSTRAINT "pagina_inicial_blocks_contato_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ADD CONSTRAINT "pagina_inicial_blocks_apoiadores_apoiadores_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ADD CONSTRAINT "pagina_inicial_blocks_apoiadores_apoiadores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial_blocks_apoiadores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_blocks_apoiadores" ADD CONSTRAINT "pagina_inicial_blocks_apoiadores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial" ADD CONSTRAINT "pagina_inicial_topo_imagem_id_midia_id_fk" FOREIGN KEY ("topo_imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pagina_inicial"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pagina_inicial_rels" ADD CONSTRAINT "pagina_inicial_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_version_topo_botoes" ADD CONSTRAINT "_pagina_inicial_v_version_topo_botoes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_proxima_etapa" ADD CONSTRAINT "_pagina_inicial_v_blocks_proxima_etapa_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_lideres" ADD CONSTRAINT "_pagina_inicial_v_blocks_lideres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_calendario" ADD CONSTRAINT "_pagina_inicial_v_blocks_calendario_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_treinos" ADD CONSTRAINT "_pagina_inicial_v_blocks_treinos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_noticias" ADD CONSTRAINT "_pagina_inicial_v_blocks_noticias_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_comunicados" ADD CONSTRAINT "_pagina_inicial_v_blocks_comunicados_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_pilotos" ADD CONSTRAINT "_pagina_inicial_v_blocks_pilotos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_galeria_destaque" ADD CONSTRAINT "_pagina_inicial_v_blocks_galeria_destaque_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_galeria_destaque" ADD CONSTRAINT "_pagina_inicial_v_blocks_galeria_destaque_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_kartodromo" ADD CONSTRAINT "_pagina_inicial_v_blocks_kartodromo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_ingressos" ADD CONSTRAINT "_pagina_inicial_v_blocks_ingressos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_perguntas" ADD CONSTRAINT "_pagina_inicial_v_blocks_perguntas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_contato" ADD CONSTRAINT "_pagina_inicial_v_blocks_contato_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ADD CONSTRAINT "_pagina_inicial_v_blocks_apoiadores_apoiadores_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ADD CONSTRAINT "_pagina_inicial_v_blocks_apoiadores_apoiadores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v_blocks_apoiadores"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores" ADD CONSTRAINT "_pagina_inicial_v_blocks_apoiadores_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v" ADD CONSTRAINT "_pagina_inicial_v_version_topo_imagem_id_midia_id_fk" FOREIGN KEY ("version_topo_imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pagina_inicial_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pagina_inicial_v_rels" ADD CONSTRAINT "_pagina_inicial_v_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_taxas" ADD CONSTRAINT "kartodromo_taxas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_como_treinar" ADD CONSTRAINT "kartodromo_como_treinar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_estrutura" ADD CONSTRAINT "kartodromo_estrutura_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kartodromo_estrutura" ADD CONSTRAINT "kartodromo_estrutura_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_dados_pista" ADD CONSTRAINT "kartodromo_dados_pista_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo" ADD CONSTRAINT "kartodromo_imagem_topo_id_midia_id_fk" FOREIGN KEY ("imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kartodromo" ADD CONSTRAINT "kartodromo_tracado_id_midia_id_fk" FOREIGN KEY ("tracado_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "kartodromo_rels" ADD CONSTRAINT "kartodromo_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_rels" ADD CONSTRAINT "kartodromo_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_taxas" ADD CONSTRAINT "_kartodromo_v_version_taxas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_como_treinar" ADD CONSTRAINT "_kartodromo_v_version_como_treinar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_estrutura" ADD CONSTRAINT "_kartodromo_v_version_estrutura_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_estrutura" ADD CONSTRAINT "_kartodromo_v_version_estrutura_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_dados_pista" ADD CONSTRAINT "_kartodromo_v_version_dados_pista_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v" ADD CONSTRAINT "_kartodromo_v_version_imagem_topo_id_midia_id_fk" FOREIGN KEY ("version_imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_kartodromo_v" ADD CONSTRAINT "_kartodromo_v_version_tracado_id_midia_id_fk" FOREIGN KEY ("version_tracado_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_rels" ADD CONSTRAINT "_kartodromo_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_rels" ADD CONSTRAINT "_kartodromo_v_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contato_canais_exibir_em" ADD CONSTRAINT "contato_canais_exibir_em_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contato_canais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contato_canais" ADD CONSTRAINT "contato_canais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contato"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contato_horarios" ADD CONSTRAINT "contato_horarios_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contato"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contato_redes" ADD CONSTRAINT "contato_redes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."contato"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "contato" ADD CONSTRAINT "contato_endereco_imagem_mapa_id_midia_id_fk" FOREIGN KEY ("endereco_imagem_mapa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contato_v_version_canais_exibir_em" ADD CONSTRAINT "_contato_v_version_canais_exibir_em_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_contato_v_version_canais"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contato_v_version_canais" ADD CONSTRAINT "_contato_v_version_canais_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contato_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contato_v_version_horarios" ADD CONSTRAINT "_contato_v_version_horarios_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contato_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contato_v_version_redes" ADD CONSTRAINT "_contato_v_version_redes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_contato_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_contato_v" ADD CONSTRAINT "_contato_v_version_endereco_imagem_mapa_id_midia_id_fk" FOREIGN KEY ("version_endereco_imagem_mapa_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institucional_pilares" ADD CONSTRAINT "institucional_pilares_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institucional_marcos" ADD CONSTRAINT "institucional_marcos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institucional_diretoria" ADD CONSTRAINT "institucional_diretoria_foto_id_midia_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institucional_diretoria" ADD CONSTRAINT "institucional_diretoria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institucional" ADD CONSTRAINT "institucional_imagem_topo_id_midia_id_fk" FOREIGN KEY ("imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institucional" ADD CONSTRAINT "institucional_galeria_id_galerias_id_fk" FOREIGN KEY ("galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "institucional_rels" ADD CONSTRAINT "institucional_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."institucional"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "institucional_rels" ADD CONSTRAINT "institucional_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institucional_v_version_pilares" ADD CONSTRAINT "_institucional_v_version_pilares_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_institucional_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institucional_v_version_marcos" ADD CONSTRAINT "_institucional_v_version_marcos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_institucional_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institucional_v_version_diretoria" ADD CONSTRAINT "_institucional_v_version_diretoria_foto_id_midia_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institucional_v_version_diretoria" ADD CONSTRAINT "_institucional_v_version_diretoria_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_institucional_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institucional_v" ADD CONSTRAINT "_institucional_v_version_imagem_topo_id_midia_id_fk" FOREIGN KEY ("version_imagem_topo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institucional_v" ADD CONSTRAINT "_institucional_v_version_galeria_id_galerias_id_fk" FOREIGN KEY ("version_galeria_id") REFERENCES "public"."galerias"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_institucional_v_rels" ADD CONSTRAINT "_institucional_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_institucional_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_institucional_v_rels" ADD CONSTRAINT "_institucional_v_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "textos_paginas_paginas" ADD CONSTRAINT "textos_paginas_paginas_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "textos_paginas_paginas" ADD CONSTRAINT "textos_paginas_paginas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."textos_paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_textos_paginas_v_version_paginas" ADD CONSTRAINT "_textos_paginas_v_version_paginas_imagem_id_midia_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_textos_paginas_v_version_paginas" ADD CONSTRAINT "_textos_paginas_v_version_paginas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_textos_paginas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_menu_subitens" ADD CONSTRAINT "navegacao_menu_subitens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacao_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_menu" ADD CONSTRAINT "navegacao_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rodape_links" ADD CONSTRAINT "navegacao_rodape_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacao_rodape"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rodape" ADD CONSTRAINT "navegacao_rodape_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."navegacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navegacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "navegacao_rels" ADD CONSTRAINT "navegacao_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_version_menu_subitens" ADD CONSTRAINT "_navegacao_v_version_menu_subitens_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navegacao_v_version_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_version_menu" ADD CONSTRAINT "_navegacao_v_version_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navegacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_version_rodape_links" ADD CONSTRAINT "_navegacao_v_version_rodape_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navegacao_v_version_rodape"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_version_rodape" ADD CONSTRAINT "_navegacao_v_version_rodape_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_navegacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_navegacao_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_paginas_fk" FOREIGN KEY ("paginas_id") REFERENCES "public"."paginas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_noticias_fk" FOREIGN KEY ("noticias_id") REFERENCES "public"."noticias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_etapas_fk" FOREIGN KEY ("etapas_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_temporadas_fk" FOREIGN KEY ("temporadas_id") REFERENCES "public"."temporadas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_pilotos_fk" FOREIGN KEY ("pilotos_id") REFERENCES "public"."pilotos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_galerias_fk" FOREIGN KEY ("galerias_id") REFERENCES "public"."galerias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_documentos_fk" FOREIGN KEY ("documentos_id") REFERENCES "public"."documentos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_navegacao_v_rels" ADD CONSTRAINT "_navegacao_v_rels_eventos_fk" FOREIGN KEY ("eventos_id") REFERENCES "public"."eventos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_logo_id_midia_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_logo_fundo_escuro_id_midia_id_fk" FOREIGN KEY ("logo_fundo_escuro_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_favicon_id_midia_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_campeonato_principal_id_campeonatos_id_fk" FOREIGN KEY ("campeonato_principal_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_imagem_compartilhamento_id_midia_id_fk" FOREIGN KEY ("imagem_compartilhamento_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_configuracoes_v" ADD CONSTRAINT "_configuracoes_v_version_logo_id_midia_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_configuracoes_v" ADD CONSTRAINT "_configuracoes_v_version_logo_fundo_escuro_id_midia_id_fk" FOREIGN KEY ("version_logo_fundo_escuro_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_configuracoes_v" ADD CONSTRAINT "_configuracoes_v_version_favicon_id_midia_id_fk" FOREIGN KEY ("version_favicon_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_configuracoes_v" ADD CONSTRAINT "_configuracoes_v_version_campeonato_principal_id_campeonatos_id_fk" FOREIGN KEY ("version_campeonato_principal_id") REFERENCES "public"."campeonatos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_configuracoes_v" ADD CONSTRAINT "_configuracoes_v_version_imagem_compartilhamento_id_midia_id_fk" FOREIGN KEY ("version_imagem_compartilhamento_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "etapas_titulo_idx" ON "etapas" USING btree ("titulo");
  CREATE INDEX "etapas_temporada_idx" ON "etapas" USING btree ("temporada_id");
  CREATE INDEX "etapas_numero_idx" ON "etapas" USING btree ("numero");
  CREATE INDEX "etapas_inicio_idx" ON "etapas" USING btree ("inicio");
  CREATE INDEX "etapas_status_idx" ON "etapas" USING btree ("status");
  CREATE INDEX "etapas_imagem_idx" ON "etapas" USING btree ("imagem_id");
  CREATE INDEX "etapas_visibilidade_idx" ON "etapas" USING btree ("visibilidade");
  CREATE INDEX "etapas_texto_busca_idx" ON "etapas" USING btree ("texto_busca");
  CREATE INDEX "etapas_updated_at_idx" ON "etapas" USING btree ("updated_at");
  CREATE INDEX "etapas_created_at_idx" ON "etapas" USING btree ("created_at");
  CREATE UNIQUE INDEX "temporada_numero_idx" ON "etapas" USING btree ("temporada_id","numero");
  CREATE INDEX "etapas_rels_order_idx" ON "etapas_rels" USING btree ("order");
  CREATE INDEX "etapas_rels_parent_idx" ON "etapas_rels" USING btree ("parent_id");
  CREATE INDEX "etapas_rels_path_idx" ON "etapas_rels" USING btree ("path");
  CREATE INDEX "etapas_rels_categorias_id_idx" ON "etapas_rels" USING btree ("categorias_id");
  CREATE INDEX "corridas_resultados_order_idx" ON "corridas_resultados" USING btree ("_order");
  CREATE INDEX "corridas_resultados_parent_id_idx" ON "corridas_resultados" USING btree ("_parent_id");
  CREATE INDEX "corridas_resultados_inscricao_idx" ON "corridas_resultados" USING btree ("inscricao_id");
  CREATE INDEX "corridas_titulo_idx" ON "corridas" USING btree ("titulo");
  CREATE UNIQUE INDEX "corridas_chave_unica_idx" ON "corridas" USING btree ("chave_unica");
  CREATE INDEX "corridas_etapa_idx" ON "corridas" USING btree ("etapa_id");
  CREATE INDEX "corridas_status_idx" ON "corridas" USING btree ("status");
  CREATE INDEX "corridas_volta_mais_rapida_manual_volta_mais_rapida_manu_idx" ON "corridas" USING btree ("volta_mais_rapida_manual_inscricao_id");
  CREATE INDEX "corridas_updated_at_idx" ON "corridas" USING btree ("updated_at");
  CREATE INDEX "corridas_created_at_idx" ON "corridas" USING btree ("created_at");
  CREATE INDEX "corridas_rels_order_idx" ON "corridas_rels" USING btree ("order");
  CREATE INDEX "corridas_rels_parent_idx" ON "corridas_rels" USING btree ("parent_id");
  CREATE INDEX "corridas_rels_path_idx" ON "corridas_rels" USING btree ("path");
  CREATE INDEX "corridas_rels_categorias_id_idx" ON "corridas_rels" USING btree ("categorias_id");
  CREATE INDEX "temporada_categorias_ajustes_order_idx" ON "temporada_categorias_ajustes" USING btree ("_order");
  CREATE INDEX "temporada_categorias_ajustes_parent_id_idx" ON "temporada_categorias_ajustes" USING btree ("_parent_id");
  CREATE INDEX "temporada_categorias_ajustes_inscricao_idx" ON "temporada_categorias_ajustes" USING btree ("inscricao_id");
  CREATE INDEX "temporada_categorias_ajustes_etapa_idx" ON "temporada_categorias_ajustes" USING btree ("etapa_id");
  CREATE INDEX "temporada_categorias_ajustes_documento_idx" ON "temporada_categorias_ajustes" USING btree ("documento_id");
  CREATE INDEX "temporada_categorias_ajustes_registrado_por_idx" ON "temporada_categorias_ajustes" USING btree ("registrado_por_id");
  CREATE INDEX "temporada_categorias_linhas_manuais_order_idx" ON "temporada_categorias_linhas_manuais" USING btree ("_order");
  CREATE INDEX "temporada_categorias_linhas_manuais_parent_id_idx" ON "temporada_categorias_linhas_manuais" USING btree ("_parent_id");
  CREATE INDEX "temporada_categorias_linhas_manuais_piloto_idx" ON "temporada_categorias_linhas_manuais" USING btree ("piloto_id");
  CREATE INDEX "temporada_categorias_linhas_manuais_equipe_idx" ON "temporada_categorias_linhas_manuais" USING btree ("equipe_id");
  CREATE INDEX "temporada_categorias_titulo_idx" ON "temporada_categorias" USING btree ("titulo");
  CREATE INDEX "temporada_categorias_temporada_idx" ON "temporada_categorias" USING btree ("temporada_id");
  CREATE INDEX "temporada_categorias_categoria_idx" ON "temporada_categorias" USING btree ("categoria_id");
  CREATE INDEX "temporada_categorias_publicada_idx" ON "temporada_categorias" USING btree ("publicada");
  CREATE INDEX "temporada_categorias_destaque_manual_destaque_manual_ins_idx" ON "temporada_categorias" USING btree ("destaque_manual_inscricao_id");
  CREATE INDEX "temporada_categorias_regra_idx" ON "temporada_categorias" USING btree ("regra_id");
  CREATE INDEX "temporada_categorias_campeao_idx" ON "temporada_categorias" USING btree ("campeao_id");
  CREATE INDEX "temporada_categorias_vice_idx" ON "temporada_categorias" USING btree ("vice_id");
  CREATE INDEX "temporada_categorias_terceiro_idx" ON "temporada_categorias" USING btree ("terceiro_id");
  CREATE INDEX "temporada_categorias_updated_at_idx" ON "temporada_categorias" USING btree ("updated_at");
  CREATE INDEX "temporada_categorias_created_at_idx" ON "temporada_categorias" USING btree ("created_at");
  CREATE UNIQUE INDEX "temporada_categoria_idx" ON "temporada_categorias" USING btree ("temporada_id","categoria_id");
  CREATE INDEX "temporada_categorias_rels_order_idx" ON "temporada_categorias_rels" USING btree ("order");
  CREATE INDEX "temporada_categorias_rels_parent_idx" ON "temporada_categorias_rels" USING btree ("parent_id");
  CREATE INDEX "temporada_categorias_rels_path_idx" ON "temporada_categorias_rels" USING btree ("path");
  CREATE INDEX "temporada_categorias_rels_categorias_id_idx" ON "temporada_categorias_rels" USING btree ("categorias_id");
  CREATE INDEX "pilotos_foto_idx" ON "pilotos" USING btree ("foto_id");
  CREATE INDEX "pilotos_autorizacao_imagem_autorizacao_imagem_documento_idx" ON "pilotos" USING btree ("autorizacao_imagem_documento_id");
  CREATE UNIQUE INDEX "pilotos_slug_idx" ON "pilotos" USING btree ("slug");
  CREATE INDEX "pilotos_visibilidade_idx" ON "pilotos" USING btree ("visibilidade");
  CREATE INDEX "pilotos_texto_busca_idx" ON "pilotos" USING btree ("texto_busca");
  CREATE INDEX "pilotos_updated_at_idx" ON "pilotos" USING btree ("updated_at");
  CREATE INDEX "pilotos_created_at_idx" ON "pilotos" USING btree ("created_at");
  CREATE INDEX "inscricoes_titulo_idx" ON "inscricoes" USING btree ("titulo");
  CREATE INDEX "inscricoes_temporada_idx" ON "inscricoes" USING btree ("temporada_id");
  CREATE INDEX "inscricoes_categoria_idx" ON "inscricoes" USING btree ("categoria_id");
  CREATE INDEX "inscricoes_piloto_idx" ON "inscricoes" USING btree ("piloto_id");
  CREATE INDEX "inscricoes_numero_idx" ON "inscricoes" USING btree ("numero");
  CREATE INDEX "inscricoes_equipe_idx" ON "inscricoes" USING btree ("equipe_id");
  CREATE INDEX "inscricoes_status_idx" ON "inscricoes" USING btree ("status");
  CREATE INDEX "inscricoes_updated_at_idx" ON "inscricoes" USING btree ("updated_at");
  CREATE INDEX "inscricoes_created_at_idx" ON "inscricoes" USING btree ("created_at");
  CREATE UNIQUE INDEX "temporada_categoria_piloto_idx" ON "inscricoes" USING btree ("temporada_id","categoria_id","piloto_id");
  CREATE INDEX "equipes_logo_idx" ON "equipes" USING btree ("logo_id");
  CREATE INDEX "equipes_visibilidade_idx" ON "equipes" USING btree ("visibilidade");
  CREATE INDEX "equipes_texto_busca_idx" ON "equipes" USING btree ("texto_busca");
  CREATE INDEX "equipes_updated_at_idx" ON "equipes" USING btree ("updated_at");
  CREATE INDEX "equipes_created_at_idx" ON "equipes" USING btree ("created_at");
  CREATE INDEX "categorias__order_idx" ON "categorias" USING btree ("_order");
  CREATE UNIQUE INDEX "categorias_slug_idx" ON "categorias" USING btree ("slug");
  CREATE INDEX "categorias_imagem_idx" ON "categorias" USING btree ("imagem_id");
  CREATE INDEX "categorias_visibilidade_idx" ON "categorias" USING btree ("visibilidade");
  CREATE INDEX "categorias_texto_busca_idx" ON "categorias" USING btree ("texto_busca");
  CREATE INDEX "categorias_updated_at_idx" ON "categorias" USING btree ("updated_at");
  CREATE INDEX "categorias_created_at_idx" ON "categorias" USING btree ("created_at");
  CREATE INDEX "temporadas_formato_etapa_order_idx" ON "temporadas_formato_etapa" USING btree ("_order");
  CREATE INDEX "temporadas_formato_etapa_parent_id_idx" ON "temporadas_formato_etapa" USING btree ("_parent_id");
  CREATE INDEX "temporadas_campeonato_idx" ON "temporadas" USING btree ("campeonato_id");
  CREATE INDEX "temporadas_ano_idx" ON "temporadas" USING btree ("ano");
  CREATE INDEX "temporadas_status_idx" ON "temporadas" USING btree ("status");
  CREATE INDEX "temporadas_logo_idx" ON "temporadas" USING btree ("logo_id");
  CREATE INDEX "temporadas_banner_idx" ON "temporadas" USING btree ("banner_id");
  CREATE INDEX "temporadas_regra_idx" ON "temporadas" USING btree ("regra_id");
  CREATE INDEX "temporadas_slug_idx" ON "temporadas" USING btree ("slug");
  CREATE INDEX "temporadas_visibilidade_idx" ON "temporadas" USING btree ("visibilidade");
  CREATE INDEX "temporadas_texto_busca_idx" ON "temporadas" USING btree ("texto_busca");
  CREATE INDEX "temporadas_updated_at_idx" ON "temporadas" USING btree ("updated_at");
  CREATE INDEX "temporadas_created_at_idx" ON "temporadas" USING btree ("created_at");
  CREATE UNIQUE INDEX "campeonato_slug_idx" ON "temporadas" USING btree ("campeonato_id","slug");
  CREATE INDEX "temporadas_rels_order_idx" ON "temporadas_rels" USING btree ("order");
  CREATE INDEX "temporadas_rels_parent_idx" ON "temporadas_rels" USING btree ("parent_id");
  CREATE INDEX "temporadas_rels_path_idx" ON "temporadas_rels" USING btree ("path");
  CREATE INDEX "temporadas_rels_categorias_id_idx" ON "temporadas_rels" USING btree ("categorias_id");
  CREATE INDEX "campeonatos__order_idx" ON "campeonatos" USING btree ("_order");
  CREATE INDEX "campeonatos_temporada_atual_idx" ON "campeonatos" USING btree ("temporada_atual_id");
  CREATE INDEX "campeonatos_logo_idx" ON "campeonatos" USING btree ("logo_id");
  CREATE INDEX "campeonatos_banner_idx" ON "campeonatos" USING btree ("banner_id");
  CREATE INDEX "campeonatos_regulamento_idx" ON "campeonatos" USING btree ("regulamento_id");
  CREATE UNIQUE INDEX "campeonatos_slug_idx" ON "campeonatos" USING btree ("slug");
  CREATE INDEX "campeonatos_visibilidade_idx" ON "campeonatos" USING btree ("visibilidade");
  CREATE INDEX "campeonatos_texto_busca_idx" ON "campeonatos" USING btree ("texto_busca");
  CREATE INDEX "campeonatos_updated_at_idx" ON "campeonatos" USING btree ("updated_at");
  CREATE INDEX "campeonatos_created_at_idx" ON "campeonatos" USING btree ("created_at");
  CREATE INDEX "regras_pontuacao_tabelas_order_idx" ON "regras_pontuacao_tabelas" USING btree ("_order");
  CREATE INDEX "regras_pontuacao_tabelas_parent_id_idx" ON "regras_pontuacao_tabelas" USING btree ("_parent_id");
  CREATE INDEX "regras_pontuacao_criterios_desempate_order_idx" ON "regras_pontuacao_criterios_desempate" USING btree ("_order");
  CREATE INDEX "regras_pontuacao_criterios_desempate_parent_id_idx" ON "regras_pontuacao_criterios_desempate" USING btree ("_parent_id");
  CREATE INDEX "regras_pontuacao_updated_at_idx" ON "regras_pontuacao" USING btree ("updated_at");
  CREATE INDEX "regras_pontuacao_created_at_idx" ON "regras_pontuacao" USING btree ("created_at");
  CREATE INDEX "regras_pontuacao_numbers_order_parent_idx" ON "regras_pontuacao_numbers" USING btree ("order","parent_id");
  CREATE INDEX "_regras_pontuacao_v_version_tabelas_order_idx" ON "_regras_pontuacao_v_version_tabelas" USING btree ("_order");
  CREATE INDEX "_regras_pontuacao_v_version_tabelas_parent_id_idx" ON "_regras_pontuacao_v_version_tabelas" USING btree ("_parent_id");
  CREATE INDEX "_regras_pontuacao_v_version_criterios_desempate_order_idx" ON "_regras_pontuacao_v_version_criterios_desempate" USING btree ("_order");
  CREATE INDEX "_regras_pontuacao_v_version_criterios_desempate_parent_id_idx" ON "_regras_pontuacao_v_version_criterios_desempate" USING btree ("_parent_id");
  CREATE INDEX "_regras_pontuacao_v_parent_idx" ON "_regras_pontuacao_v" USING btree ("parent_id");
  CREATE INDEX "_regras_pontuacao_v_version_version_updated_at_idx" ON "_regras_pontuacao_v" USING btree ("version_updated_at");
  CREATE INDEX "_regras_pontuacao_v_version_version_created_at_idx" ON "_regras_pontuacao_v" USING btree ("version_created_at");
  CREATE INDEX "_regras_pontuacao_v_created_at_idx" ON "_regras_pontuacao_v" USING btree ("created_at");
  CREATE INDEX "_regras_pontuacao_v_updated_at_idx" ON "_regras_pontuacao_v" USING btree ("updated_at");
  CREATE INDEX "_regras_pontuacao_v_numbers_order_parent_idx" ON "_regras_pontuacao_v_numbers" USING btree ("order","parent_id");
  CREATE INDEX "treinos_titulo_idx" ON "treinos" USING btree ("titulo");
  CREATE INDEX "treinos_data_idx" ON "treinos" USING btree ("data");
  CREATE INDEX "treinos_status_idx" ON "treinos" USING btree ("status");
  CREATE INDEX "treinos_dia_idx" ON "treinos" USING btree ("dia");
  CREATE INDEX "treinos_substitui_idx" ON "treinos" USING btree ("substitui_id");
  CREATE INDEX "treinos_tipo_idx" ON "treinos" USING btree ("tipo_id");
  CREATE INDEX "treinos_visibilidade_idx" ON "treinos" USING btree ("visibilidade");
  CREATE INDEX "treinos_updated_at_idx" ON "treinos" USING btree ("updated_at");
  CREATE INDEX "treinos_created_at_idx" ON "treinos" USING btree ("created_at");
  CREATE UNIQUE INDEX "substitui_dia_idx" ON "treinos" USING btree ("substitui_id","dia");
  CREATE INDEX "treinos_rels_order_idx" ON "treinos_rels" USING btree ("order");
  CREATE INDEX "treinos_rels_parent_idx" ON "treinos_rels" USING btree ("parent_id");
  CREATE INDEX "treinos_rels_path_idx" ON "treinos_rels" USING btree ("path");
  CREATE INDEX "treinos_rels_categorias_id_idx" ON "treinos_rels" USING btree ("categorias_id");
  CREATE INDEX "horarios_treino_titulo_idx" ON "horarios_treino" USING btree ("titulo");
  CREATE INDEX "horarios_treino_dia_semana_idx" ON "horarios_treino" USING btree ("dia_semana");
  CREATE INDEX "horarios_treino_tipo_idx" ON "horarios_treino" USING btree ("tipo_id");
  CREATE INDEX "horarios_treino_valido_de_idx" ON "horarios_treino" USING btree ("valido_de");
  CREATE INDEX "horarios_treino_valido_ate_idx" ON "horarios_treino" USING btree ("valido_ate");
  CREATE INDEX "horarios_treino_ordem_na_semana_idx" ON "horarios_treino" USING btree ("ordem_na_semana");
  CREATE INDEX "horarios_treino_visibilidade_idx" ON "horarios_treino" USING btree ("visibilidade");
  CREATE INDEX "horarios_treino_updated_at_idx" ON "horarios_treino" USING btree ("updated_at");
  CREATE INDEX "horarios_treino_created_at_idx" ON "horarios_treino" USING btree ("created_at");
  CREATE INDEX "horarios_treino_rels_order_idx" ON "horarios_treino_rels" USING btree ("order");
  CREATE INDEX "horarios_treino_rels_parent_idx" ON "horarios_treino_rels" USING btree ("parent_id");
  CREATE INDEX "horarios_treino_rels_path_idx" ON "horarios_treino_rels" USING btree ("path");
  CREATE INDEX "horarios_treino_rels_categorias_id_idx" ON "horarios_treino_rels" USING btree ("categorias_id");
  CREATE INDEX "tipos_treino__order_idx" ON "tipos_treino" USING btree ("_order");
  CREATE UNIQUE INDEX "tipos_treino_nome_idx" ON "tipos_treino" USING btree ("nome");
  CREATE UNIQUE INDEX "tipos_treino_slug_idx" ON "tipos_treino" USING btree ("slug");
  CREATE INDEX "tipos_treino_updated_at_idx" ON "tipos_treino" USING btree ("updated_at");
  CREATE INDEX "tipos_treino_created_at_idx" ON "tipos_treino" USING btree ("created_at");
  CREATE INDEX "noticias_capa_idx" ON "noticias" USING btree ("capa_id");
  CREATE INDEX "noticias_categoria_idx" ON "noticias" USING btree ("categoria_id");
  CREATE INDEX "noticias_destaque_idx" ON "noticias" USING btree ("destaque");
  CREATE INDEX "noticias_galeria_idx" ON "noticias" USING btree ("galeria_id");
  CREATE INDEX "noticias_etapa_idx" ON "noticias" USING btree ("etapa_id");
  CREATE INDEX "noticias_temporada_idx" ON "noticias" USING btree ("temporada_id");
  CREATE UNIQUE INDEX "noticias_slug_idx" ON "noticias" USING btree ("slug");
  CREATE INDEX "noticias_visibilidade_idx" ON "noticias" USING btree ("visibilidade");
  CREATE INDEX "noticias_publicar_em_idx" ON "noticias" USING btree ("publicar_em");
  CREATE INDEX "noticias_texto_busca_idx" ON "noticias" USING btree ("texto_busca");
  CREATE INDEX "noticias_updated_at_idx" ON "noticias" USING btree ("updated_at");
  CREATE INDEX "noticias_created_at_idx" ON "noticias" USING btree ("created_at");
  CREATE INDEX "noticias_deleted_at_idx" ON "noticias" USING btree ("deleted_at");
  CREATE INDEX "noticias__status_idx" ON "noticias" USING btree ("_status");
  CREATE INDEX "noticias_rels_order_idx" ON "noticias_rels" USING btree ("order");
  CREATE INDEX "noticias_rels_parent_idx" ON "noticias_rels" USING btree ("parent_id");
  CREATE INDEX "noticias_rels_path_idx" ON "noticias_rels" USING btree ("path");
  CREATE INDEX "noticias_rels_tags_id_idx" ON "noticias_rels" USING btree ("tags_id");
  CREATE INDEX "noticias_rels_categorias_id_idx" ON "noticias_rels" USING btree ("categorias_id");
  CREATE INDEX "noticias_rels_pilotos_id_idx" ON "noticias_rels" USING btree ("pilotos_id");
  CREATE INDEX "_noticias_v_parent_idx" ON "_noticias_v" USING btree ("parent_id");
  CREATE INDEX "_noticias_v_version_version_capa_idx" ON "_noticias_v" USING btree ("version_capa_id");
  CREATE INDEX "_noticias_v_version_version_categoria_idx" ON "_noticias_v" USING btree ("version_categoria_id");
  CREATE INDEX "_noticias_v_version_version_destaque_idx" ON "_noticias_v" USING btree ("version_destaque");
  CREATE INDEX "_noticias_v_version_version_galeria_idx" ON "_noticias_v" USING btree ("version_galeria_id");
  CREATE INDEX "_noticias_v_version_version_etapa_idx" ON "_noticias_v" USING btree ("version_etapa_id");
  CREATE INDEX "_noticias_v_version_version_temporada_idx" ON "_noticias_v" USING btree ("version_temporada_id");
  CREATE INDEX "_noticias_v_version_version_slug_idx" ON "_noticias_v" USING btree ("version_slug");
  CREATE INDEX "_noticias_v_version_version_visibilidade_idx" ON "_noticias_v" USING btree ("version_visibilidade");
  CREATE INDEX "_noticias_v_version_version_publicar_em_idx" ON "_noticias_v" USING btree ("version_publicar_em");
  CREATE INDEX "_noticias_v_version_version_texto_busca_idx" ON "_noticias_v" USING btree ("version_texto_busca");
  CREATE INDEX "_noticias_v_version_version_updated_at_idx" ON "_noticias_v" USING btree ("version_updated_at");
  CREATE INDEX "_noticias_v_version_version_created_at_idx" ON "_noticias_v" USING btree ("version_created_at");
  CREATE INDEX "_noticias_v_version_version_deleted_at_idx" ON "_noticias_v" USING btree ("version_deleted_at");
  CREATE INDEX "_noticias_v_version_version__status_idx" ON "_noticias_v" USING btree ("version__status");
  CREATE INDEX "_noticias_v_created_at_idx" ON "_noticias_v" USING btree ("created_at");
  CREATE INDEX "_noticias_v_updated_at_idx" ON "_noticias_v" USING btree ("updated_at");
  CREATE INDEX "_noticias_v_latest_idx" ON "_noticias_v" USING btree ("latest");
  CREATE INDEX "_noticias_v_autosave_idx" ON "_noticias_v" USING btree ("autosave");
  CREATE INDEX "_noticias_v_rels_order_idx" ON "_noticias_v_rels" USING btree ("order");
  CREATE INDEX "_noticias_v_rels_parent_idx" ON "_noticias_v_rels" USING btree ("parent_id");
  CREATE INDEX "_noticias_v_rels_path_idx" ON "_noticias_v_rels" USING btree ("path");
  CREATE INDEX "_noticias_v_rels_tags_id_idx" ON "_noticias_v_rels" USING btree ("tags_id");
  CREATE INDEX "_noticias_v_rels_categorias_id_idx" ON "_noticias_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_noticias_v_rels_pilotos_id_idx" ON "_noticias_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "avisos_tipo_idx" ON "avisos" USING btree ("tipo");
  CREATE INDEX "avisos_nivel_idx" ON "avisos" USING btree ("nivel");
  CREATE INDEX "avisos_destaque_idx" ON "avisos" USING btree ("destaque");
  CREATE INDEX "avisos_anexo_idx" ON "avisos" USING btree ("anexo_id");
  CREATE INDEX "avisos_etapa_idx" ON "avisos" USING btree ("etapa_id");
  CREATE INDEX "avisos_treino_idx" ON "avisos" USING btree ("treino_id");
  CREATE INDEX "avisos_visibilidade_idx" ON "avisos" USING btree ("visibilidade");
  CREATE INDEX "avisos_publicar_em_idx" ON "avisos" USING btree ("publicar_em");
  CREATE INDEX "avisos_exibir_de_idx" ON "avisos" USING btree ("exibir_de");
  CREATE INDEX "avisos_exibir_ate_idx" ON "avisos" USING btree ("exibir_ate");
  CREATE INDEX "avisos_texto_busca_idx" ON "avisos" USING btree ("texto_busca");
  CREATE INDEX "avisos_updated_at_idx" ON "avisos" USING btree ("updated_at");
  CREATE INDEX "avisos_created_at_idx" ON "avisos" USING btree ("created_at");
  CREATE INDEX "avisos_deleted_at_idx" ON "avisos" USING btree ("deleted_at");
  CREATE INDEX "avisos__status_idx" ON "avisos" USING btree ("_status");
  CREATE INDEX "_avisos_v_parent_idx" ON "_avisos_v" USING btree ("parent_id");
  CREATE INDEX "_avisos_v_version_version_tipo_idx" ON "_avisos_v" USING btree ("version_tipo");
  CREATE INDEX "_avisos_v_version_version_nivel_idx" ON "_avisos_v" USING btree ("version_nivel");
  CREATE INDEX "_avisos_v_version_version_destaque_idx" ON "_avisos_v" USING btree ("version_destaque");
  CREATE INDEX "_avisos_v_version_version_anexo_idx" ON "_avisos_v" USING btree ("version_anexo_id");
  CREATE INDEX "_avisos_v_version_version_etapa_idx" ON "_avisos_v" USING btree ("version_etapa_id");
  CREATE INDEX "_avisos_v_version_version_treino_idx" ON "_avisos_v" USING btree ("version_treino_id");
  CREATE INDEX "_avisos_v_version_version_visibilidade_idx" ON "_avisos_v" USING btree ("version_visibilidade");
  CREATE INDEX "_avisos_v_version_version_publicar_em_idx" ON "_avisos_v" USING btree ("version_publicar_em");
  CREATE INDEX "_avisos_v_version_version_exibir_de_idx" ON "_avisos_v" USING btree ("version_exibir_de");
  CREATE INDEX "_avisos_v_version_version_exibir_ate_idx" ON "_avisos_v" USING btree ("version_exibir_ate");
  CREATE INDEX "_avisos_v_version_version_texto_busca_idx" ON "_avisos_v" USING btree ("version_texto_busca");
  CREATE INDEX "_avisos_v_version_version_updated_at_idx" ON "_avisos_v" USING btree ("version_updated_at");
  CREATE INDEX "_avisos_v_version_version_created_at_idx" ON "_avisos_v" USING btree ("version_created_at");
  CREATE INDEX "_avisos_v_version_version_deleted_at_idx" ON "_avisos_v" USING btree ("version_deleted_at");
  CREATE INDEX "_avisos_v_version_version__status_idx" ON "_avisos_v" USING btree ("version__status");
  CREATE INDEX "_avisos_v_created_at_idx" ON "_avisos_v" USING btree ("created_at");
  CREATE INDEX "_avisos_v_updated_at_idx" ON "_avisos_v" USING btree ("updated_at");
  CREATE INDEX "_avisos_v_latest_idx" ON "_avisos_v" USING btree ("latest");
  CREATE INDEX "_avisos_v_autosave_idx" ON "_avisos_v" USING btree ("autosave");
  CREATE INDEX "banners__order_idx" ON "banners" USING btree ("_order");
  CREATE INDEX "banners_midia_idx" ON "banners" USING btree ("midia_id");
  CREATE INDEX "banners_imagem_celular_idx" ON "banners" USING btree ("imagem_celular_id");
  CREATE INDEX "banners_visibilidade_idx" ON "banners" USING btree ("visibilidade");
  CREATE INDEX "banners_publicar_em_idx" ON "banners" USING btree ("publicar_em");
  CREATE INDEX "banners_exibir_de_idx" ON "banners" USING btree ("exibir_de");
  CREATE INDEX "banners_exibir_ate_idx" ON "banners" USING btree ("exibir_ate");
  CREATE INDEX "banners_updated_at_idx" ON "banners" USING btree ("updated_at");
  CREATE INDEX "banners_created_at_idx" ON "banners" USING btree ("created_at");
  CREATE INDEX "banners_deleted_at_idx" ON "banners" USING btree ("deleted_at");
  CREATE INDEX "banners__status_idx" ON "banners" USING btree ("_status");
  CREATE INDEX "banners_rels_order_idx" ON "banners_rels" USING btree ("order");
  CREATE INDEX "banners_rels_parent_idx" ON "banners_rels" USING btree ("parent_id");
  CREATE INDEX "banners_rels_path_idx" ON "banners_rels" USING btree ("path");
  CREATE INDEX "banners_rels_paginas_id_idx" ON "banners_rels" USING btree ("paginas_id");
  CREATE INDEX "banners_rels_noticias_id_idx" ON "banners_rels" USING btree ("noticias_id");
  CREATE INDEX "banners_rels_etapas_id_idx" ON "banners_rels" USING btree ("etapas_id");
  CREATE INDEX "banners_rels_temporadas_id_idx" ON "banners_rels" USING btree ("temporadas_id");
  CREATE INDEX "banners_rels_categorias_id_idx" ON "banners_rels" USING btree ("categorias_id");
  CREATE INDEX "banners_rels_pilotos_id_idx" ON "banners_rels" USING btree ("pilotos_id");
  CREATE INDEX "banners_rels_galerias_id_idx" ON "banners_rels" USING btree ("galerias_id");
  CREATE INDEX "banners_rels_documentos_id_idx" ON "banners_rels" USING btree ("documentos_id");
  CREATE INDEX "banners_rels_eventos_id_idx" ON "banners_rels" USING btree ("eventos_id");
  CREATE INDEX "_banners_v_parent_idx" ON "_banners_v" USING btree ("parent_id");
  CREATE INDEX "_banners_v_version_version__order_idx" ON "_banners_v" USING btree ("version__order");
  CREATE INDEX "_banners_v_version_version_midia_idx" ON "_banners_v" USING btree ("version_midia_id");
  CREATE INDEX "_banners_v_version_version_imagem_celular_idx" ON "_banners_v" USING btree ("version_imagem_celular_id");
  CREATE INDEX "_banners_v_version_version_visibilidade_idx" ON "_banners_v" USING btree ("version_visibilidade");
  CREATE INDEX "_banners_v_version_version_publicar_em_idx" ON "_banners_v" USING btree ("version_publicar_em");
  CREATE INDEX "_banners_v_version_version_exibir_de_idx" ON "_banners_v" USING btree ("version_exibir_de");
  CREATE INDEX "_banners_v_version_version_exibir_ate_idx" ON "_banners_v" USING btree ("version_exibir_ate");
  CREATE INDEX "_banners_v_version_version_updated_at_idx" ON "_banners_v" USING btree ("version_updated_at");
  CREATE INDEX "_banners_v_version_version_created_at_idx" ON "_banners_v" USING btree ("version_created_at");
  CREATE INDEX "_banners_v_version_version_deleted_at_idx" ON "_banners_v" USING btree ("version_deleted_at");
  CREATE INDEX "_banners_v_version_version__status_idx" ON "_banners_v" USING btree ("version__status");
  CREATE INDEX "_banners_v_created_at_idx" ON "_banners_v" USING btree ("created_at");
  CREATE INDEX "_banners_v_updated_at_idx" ON "_banners_v" USING btree ("updated_at");
  CREATE INDEX "_banners_v_latest_idx" ON "_banners_v" USING btree ("latest");
  CREATE INDEX "_banners_v_autosave_idx" ON "_banners_v" USING btree ("autosave");
  CREATE INDEX "_banners_v_rels_order_idx" ON "_banners_v_rels" USING btree ("order");
  CREATE INDEX "_banners_v_rels_parent_idx" ON "_banners_v_rels" USING btree ("parent_id");
  CREATE INDEX "_banners_v_rels_path_idx" ON "_banners_v_rels" USING btree ("path");
  CREATE INDEX "_banners_v_rels_paginas_id_idx" ON "_banners_v_rels" USING btree ("paginas_id");
  CREATE INDEX "_banners_v_rels_noticias_id_idx" ON "_banners_v_rels" USING btree ("noticias_id");
  CREATE INDEX "_banners_v_rels_etapas_id_idx" ON "_banners_v_rels" USING btree ("etapas_id");
  CREATE INDEX "_banners_v_rels_temporadas_id_idx" ON "_banners_v_rels" USING btree ("temporadas_id");
  CREATE INDEX "_banners_v_rels_categorias_id_idx" ON "_banners_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_banners_v_rels_pilotos_id_idx" ON "_banners_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "_banners_v_rels_galerias_id_idx" ON "_banners_v_rels" USING btree ("galerias_id");
  CREATE INDEX "_banners_v_rels_documentos_id_idx" ON "_banners_v_rels" USING btree ("documentos_id");
  CREATE INDEX "_banners_v_rels_eventos_id_idx" ON "_banners_v_rels" USING btree ("eventos_id");
  CREATE INDEX "galerias__order_idx" ON "galerias" USING btree ("_order");
  CREATE INDEX "galerias_capa_idx" ON "galerias" USING btree ("capa_id");
  CREATE INDEX "galerias_tipo_idx" ON "galerias" USING btree ("tipo");
  CREATE INDEX "galerias_data_idx" ON "galerias" USING btree ("data");
  CREATE INDEX "galerias_etapa_idx" ON "galerias" USING btree ("etapa_id");
  CREATE INDEX "galerias_temporada_idx" ON "galerias" USING btree ("temporada_id");
  CREATE INDEX "galerias_campeonato_idx" ON "galerias" USING btree ("campeonato_id");
  CREATE INDEX "galerias_noticia_idx" ON "galerias" USING btree ("noticia_id");
  CREATE UNIQUE INDEX "galerias_slug_idx" ON "galerias" USING btree ("slug");
  CREATE INDEX "galerias_visibilidade_idx" ON "galerias" USING btree ("visibilidade");
  CREATE INDEX "galerias_publicar_em_idx" ON "galerias" USING btree ("publicar_em");
  CREATE INDEX "galerias_texto_busca_idx" ON "galerias" USING btree ("texto_busca");
  CREATE INDEX "galerias_updated_at_idx" ON "galerias" USING btree ("updated_at");
  CREATE INDEX "galerias_created_at_idx" ON "galerias" USING btree ("created_at");
  CREATE INDEX "galerias_deleted_at_idx" ON "galerias" USING btree ("deleted_at");
  CREATE INDEX "galerias__status_idx" ON "galerias" USING btree ("_status");
  CREATE INDEX "galerias_rels_order_idx" ON "galerias_rels" USING btree ("order");
  CREATE INDEX "galerias_rels_parent_idx" ON "galerias_rels" USING btree ("parent_id");
  CREATE INDEX "galerias_rels_path_idx" ON "galerias_rels" USING btree ("path");
  CREATE INDEX "galerias_rels_midia_id_idx" ON "galerias_rels" USING btree ("midia_id");
  CREATE INDEX "galerias_rels_pilotos_id_idx" ON "galerias_rels" USING btree ("pilotos_id");
  CREATE INDEX "galerias_rels_categorias_id_idx" ON "galerias_rels" USING btree ("categorias_id");
  CREATE INDEX "_galerias_v_parent_idx" ON "_galerias_v" USING btree ("parent_id");
  CREATE INDEX "_galerias_v_version_version__order_idx" ON "_galerias_v" USING btree ("version__order");
  CREATE INDEX "_galerias_v_version_version_capa_idx" ON "_galerias_v" USING btree ("version_capa_id");
  CREATE INDEX "_galerias_v_version_version_tipo_idx" ON "_galerias_v" USING btree ("version_tipo");
  CREATE INDEX "_galerias_v_version_version_data_idx" ON "_galerias_v" USING btree ("version_data");
  CREATE INDEX "_galerias_v_version_version_etapa_idx" ON "_galerias_v" USING btree ("version_etapa_id");
  CREATE INDEX "_galerias_v_version_version_temporada_idx" ON "_galerias_v" USING btree ("version_temporada_id");
  CREATE INDEX "_galerias_v_version_version_campeonato_idx" ON "_galerias_v" USING btree ("version_campeonato_id");
  CREATE INDEX "_galerias_v_version_version_noticia_idx" ON "_galerias_v" USING btree ("version_noticia_id");
  CREATE INDEX "_galerias_v_version_version_slug_idx" ON "_galerias_v" USING btree ("version_slug");
  CREATE INDEX "_galerias_v_version_version_visibilidade_idx" ON "_galerias_v" USING btree ("version_visibilidade");
  CREATE INDEX "_galerias_v_version_version_publicar_em_idx" ON "_galerias_v" USING btree ("version_publicar_em");
  CREATE INDEX "_galerias_v_version_version_texto_busca_idx" ON "_galerias_v" USING btree ("version_texto_busca");
  CREATE INDEX "_galerias_v_version_version_updated_at_idx" ON "_galerias_v" USING btree ("version_updated_at");
  CREATE INDEX "_galerias_v_version_version_created_at_idx" ON "_galerias_v" USING btree ("version_created_at");
  CREATE INDEX "_galerias_v_version_version_deleted_at_idx" ON "_galerias_v" USING btree ("version_deleted_at");
  CREATE INDEX "_galerias_v_version_version__status_idx" ON "_galerias_v" USING btree ("version__status");
  CREATE INDEX "_galerias_v_created_at_idx" ON "_galerias_v" USING btree ("created_at");
  CREATE INDEX "_galerias_v_updated_at_idx" ON "_galerias_v" USING btree ("updated_at");
  CREATE INDEX "_galerias_v_latest_idx" ON "_galerias_v" USING btree ("latest");
  CREATE INDEX "_galerias_v_autosave_idx" ON "_galerias_v" USING btree ("autosave");
  CREATE INDEX "_galerias_v_rels_order_idx" ON "_galerias_v_rels" USING btree ("order");
  CREATE INDEX "_galerias_v_rels_parent_idx" ON "_galerias_v_rels" USING btree ("parent_id");
  CREATE INDEX "_galerias_v_rels_path_idx" ON "_galerias_v_rels" USING btree ("path");
  CREATE INDEX "_galerias_v_rels_midia_id_idx" ON "_galerias_v_rels" USING btree ("midia_id");
  CREATE INDEX "_galerias_v_rels_pilotos_id_idx" ON "_galerias_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "_galerias_v_rels_categorias_id_idx" ON "_galerias_v_rels" USING btree ("categorias_id");
  CREATE INDEX "midia_capa_do_video_idx" ON "midia" USING btree ("capa_do_video_id");
  CREATE INDEX "midia_enviado_por_idx" ON "midia" USING btree ("enviado_por_id");
  CREATE INDEX "midia_folder_idx" ON "midia" USING btree ("folder_id");
  CREATE INDEX "midia_updated_at_idx" ON "midia" USING btree ("updated_at");
  CREATE INDEX "midia_created_at_idx" ON "midia" USING btree ("created_at");
  CREATE UNIQUE INDEX "midia_filename_idx" ON "midia" USING btree ("filename");
  CREATE INDEX "midia_sizes_miniatura_sizes_miniatura_filename_idx" ON "midia" USING btree ("sizes_miniatura_filename");
  CREATE INDEX "midia_sizes_card_sizes_card_filename_idx" ON "midia" USING btree ("sizes_card_filename");
  CREATE INDEX "midia_sizes_destaque_sizes_destaque_filename_idx" ON "midia" USING btree ("sizes_destaque_filename");
  CREATE INDEX "midia_sizes_compartilhamento_sizes_compartilhamento_file_idx" ON "midia" USING btree ("sizes_compartilhamento_filename");
  CREATE INDEX "midia_rels_order_idx" ON "midia_rels" USING btree ("order");
  CREATE INDEX "midia_rels_parent_idx" ON "midia_rels" USING btree ("parent_id");
  CREATE INDEX "midia_rels_path_idx" ON "midia_rels" USING btree ("path");
  CREATE INDEX "midia_rels_pilotos_id_idx" ON "midia_rels" USING btree ("pilotos_id");
  CREATE INDEX "documentos__order_idx" ON "documentos" USING btree ("_order");
  CREATE INDEX "documentos_tipo_idx" ON "documentos" USING btree ("tipo_id");
  CREATE INDEX "documentos_substitui_idx" ON "documentos" USING btree ("substitui_id");
  CREATE INDEX "documentos_campeonato_idx" ON "documentos" USING btree ("campeonato_id");
  CREATE INDEX "documentos_temporada_idx" ON "documentos" USING btree ("temporada_id");
  CREATE INDEX "documentos_categoria_idx" ON "documentos" USING btree ("categoria_id");
  CREATE UNIQUE INDEX "documentos_slug_idx" ON "documentos" USING btree ("slug");
  CREATE INDEX "documentos_visibilidade_idx" ON "documentos" USING btree ("visibilidade");
  CREATE INDEX "documentos_publicar_em_idx" ON "documentos" USING btree ("publicar_em");
  CREATE INDEX "documentos_texto_busca_idx" ON "documentos" USING btree ("texto_busca");
  CREATE INDEX "documentos_updated_at_idx" ON "documentos" USING btree ("updated_at");
  CREATE INDEX "documentos_created_at_idx" ON "documentos" USING btree ("created_at");
  CREATE INDEX "documentos_deleted_at_idx" ON "documentos" USING btree ("deleted_at");
  CREATE INDEX "documentos__status_idx" ON "documentos" USING btree ("_status");
  CREATE UNIQUE INDEX "documentos_filename_idx" ON "documentos" USING btree ("filename");
  CREATE INDEX "_documentos_v_parent_idx" ON "_documentos_v" USING btree ("parent_id");
  CREATE INDEX "_documentos_v_version_version__order_idx" ON "_documentos_v" USING btree ("version__order");
  CREATE INDEX "_documentos_v_version_version_tipo_idx" ON "_documentos_v" USING btree ("version_tipo_id");
  CREATE INDEX "_documentos_v_version_version_substitui_idx" ON "_documentos_v" USING btree ("version_substitui_id");
  CREATE INDEX "_documentos_v_version_version_campeonato_idx" ON "_documentos_v" USING btree ("version_campeonato_id");
  CREATE INDEX "_documentos_v_version_version_temporada_idx" ON "_documentos_v" USING btree ("version_temporada_id");
  CREATE INDEX "_documentos_v_version_version_categoria_idx" ON "_documentos_v" USING btree ("version_categoria_id");
  CREATE INDEX "_documentos_v_version_version_slug_idx" ON "_documentos_v" USING btree ("version_slug");
  CREATE INDEX "_documentos_v_version_version_visibilidade_idx" ON "_documentos_v" USING btree ("version_visibilidade");
  CREATE INDEX "_documentos_v_version_version_publicar_em_idx" ON "_documentos_v" USING btree ("version_publicar_em");
  CREATE INDEX "_documentos_v_version_version_texto_busca_idx" ON "_documentos_v" USING btree ("version_texto_busca");
  CREATE INDEX "_documentos_v_version_version_updated_at_idx" ON "_documentos_v" USING btree ("version_updated_at");
  CREATE INDEX "_documentos_v_version_version_created_at_idx" ON "_documentos_v" USING btree ("version_created_at");
  CREATE INDEX "_documentos_v_version_version_deleted_at_idx" ON "_documentos_v" USING btree ("version_deleted_at");
  CREATE INDEX "_documentos_v_version_version__status_idx" ON "_documentos_v" USING btree ("version__status");
  CREATE INDEX "_documentos_v_version_version_filename_idx" ON "_documentos_v" USING btree ("version_filename");
  CREATE INDEX "_documentos_v_created_at_idx" ON "_documentos_v" USING btree ("created_at");
  CREATE INDEX "_documentos_v_updated_at_idx" ON "_documentos_v" USING btree ("updated_at");
  CREATE INDEX "_documentos_v_latest_idx" ON "_documentos_v" USING btree ("latest");
  CREATE INDEX "eventos_inicio_idx" ON "eventos" USING btree ("inicio");
  CREATE INDEX "eventos_fim_idx" ON "eventos" USING btree ("fim");
  CREATE INDEX "eventos_imagem_idx" ON "eventos" USING btree ("imagem_id");
  CREATE UNIQUE INDEX "eventos_slug_idx" ON "eventos" USING btree ("slug");
  CREATE INDEX "eventos_visibilidade_idx" ON "eventos" USING btree ("visibilidade");
  CREATE INDEX "eventos_publicar_em_idx" ON "eventos" USING btree ("publicar_em");
  CREATE INDEX "eventos_texto_busca_idx" ON "eventos" USING btree ("texto_busca");
  CREATE INDEX "eventos_updated_at_idx" ON "eventos" USING btree ("updated_at");
  CREATE INDEX "eventos_created_at_idx" ON "eventos" USING btree ("created_at");
  CREATE INDEX "eventos_deleted_at_idx" ON "eventos" USING btree ("deleted_at");
  CREATE INDEX "eventos__status_idx" ON "eventos" USING btree ("_status");
  CREATE INDEX "eventos_rels_order_idx" ON "eventos_rels" USING btree ("order");
  CREATE INDEX "eventos_rels_parent_idx" ON "eventos_rels" USING btree ("parent_id");
  CREATE INDEX "eventos_rels_path_idx" ON "eventos_rels" USING btree ("path");
  CREATE INDEX "eventos_rels_categorias_id_idx" ON "eventos_rels" USING btree ("categorias_id");
  CREATE INDEX "_eventos_v_parent_idx" ON "_eventos_v" USING btree ("parent_id");
  CREATE INDEX "_eventos_v_version_version_inicio_idx" ON "_eventos_v" USING btree ("version_inicio");
  CREATE INDEX "_eventos_v_version_version_fim_idx" ON "_eventos_v" USING btree ("version_fim");
  CREATE INDEX "_eventos_v_version_version_imagem_idx" ON "_eventos_v" USING btree ("version_imagem_id");
  CREATE INDEX "_eventos_v_version_version_slug_idx" ON "_eventos_v" USING btree ("version_slug");
  CREATE INDEX "_eventos_v_version_version_visibilidade_idx" ON "_eventos_v" USING btree ("version_visibilidade");
  CREATE INDEX "_eventos_v_version_version_publicar_em_idx" ON "_eventos_v" USING btree ("version_publicar_em");
  CREATE INDEX "_eventos_v_version_version_texto_busca_idx" ON "_eventos_v" USING btree ("version_texto_busca");
  CREATE INDEX "_eventos_v_version_version_updated_at_idx" ON "_eventos_v" USING btree ("version_updated_at");
  CREATE INDEX "_eventos_v_version_version_created_at_idx" ON "_eventos_v" USING btree ("version_created_at");
  CREATE INDEX "_eventos_v_version_version_deleted_at_idx" ON "_eventos_v" USING btree ("version_deleted_at");
  CREATE INDEX "_eventos_v_version_version__status_idx" ON "_eventos_v" USING btree ("version__status");
  CREATE INDEX "_eventos_v_created_at_idx" ON "_eventos_v" USING btree ("created_at");
  CREATE INDEX "_eventos_v_updated_at_idx" ON "_eventos_v" USING btree ("updated_at");
  CREATE INDEX "_eventos_v_latest_idx" ON "_eventos_v" USING btree ("latest");
  CREATE INDEX "_eventos_v_autosave_idx" ON "_eventos_v" USING btree ("autosave");
  CREATE INDEX "_eventos_v_rels_order_idx" ON "_eventos_v_rels" USING btree ("order");
  CREATE INDEX "_eventos_v_rels_parent_idx" ON "_eventos_v_rels" USING btree ("parent_id");
  CREATE INDEX "_eventos_v_rels_path_idx" ON "_eventos_v_rels" USING btree ("path");
  CREATE INDEX "_eventos_v_rels_categorias_id_idx" ON "_eventos_v_rels" USING btree ("categorias_id");
  CREATE INDEX "paginas_blocks_texto_order_idx" ON "paginas_blocks_texto" USING btree ("_order");
  CREATE INDEX "paginas_blocks_texto_parent_id_idx" ON "paginas_blocks_texto" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_texto_path_idx" ON "paginas_blocks_texto" USING btree ("_path");
  CREATE INDEX "paginas_blocks_imagem_order_idx" ON "paginas_blocks_imagem" USING btree ("_order");
  CREATE INDEX "paginas_blocks_imagem_parent_id_idx" ON "paginas_blocks_imagem" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_imagem_path_idx" ON "paginas_blocks_imagem" USING btree ("_path");
  CREATE INDEX "paginas_blocks_imagem_imagem_idx" ON "paginas_blocks_imagem" USING btree ("imagem_id");
  CREATE INDEX "paginas_blocks_galeria_order_idx" ON "paginas_blocks_galeria" USING btree ("_order");
  CREATE INDEX "paginas_blocks_galeria_parent_id_idx" ON "paginas_blocks_galeria" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_galeria_path_idx" ON "paginas_blocks_galeria" USING btree ("_path");
  CREATE INDEX "paginas_blocks_galeria_galeria_idx" ON "paginas_blocks_galeria" USING btree ("galeria_id");
  CREATE INDEX "paginas_blocks_botao_order_idx" ON "paginas_blocks_botao" USING btree ("_order");
  CREATE INDEX "paginas_blocks_botao_parent_id_idx" ON "paginas_blocks_botao" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_botao_path_idx" ON "paginas_blocks_botao" USING btree ("_path");
  CREATE INDEX "paginas_blocks_video_order_idx" ON "paginas_blocks_video" USING btree ("_order");
  CREATE INDEX "paginas_blocks_video_parent_id_idx" ON "paginas_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_video_path_idx" ON "paginas_blocks_video" USING btree ("_path");
  CREATE INDEX "paginas_blocks_documento_order_idx" ON "paginas_blocks_documento" USING btree ("_order");
  CREATE INDEX "paginas_blocks_documento_parent_id_idx" ON "paginas_blocks_documento" USING btree ("_parent_id");
  CREATE INDEX "paginas_blocks_documento_path_idx" ON "paginas_blocks_documento" USING btree ("_path");
  CREATE INDEX "paginas_blocks_documento_documento_idx" ON "paginas_blocks_documento" USING btree ("documento_id");
  CREATE INDEX "paginas__order_idx" ON "paginas" USING btree ("_order");
  CREATE INDEX "paginas_imagem_topo_idx" ON "paginas" USING btree ("imagem_topo_id");
  CREATE UNIQUE INDEX "paginas_slug_idx" ON "paginas" USING btree ("slug");
  CREATE INDEX "paginas_visibilidade_idx" ON "paginas" USING btree ("visibilidade");
  CREATE INDEX "paginas_publicar_em_idx" ON "paginas" USING btree ("publicar_em");
  CREATE INDEX "paginas_texto_busca_idx" ON "paginas" USING btree ("texto_busca");
  CREATE INDEX "paginas_updated_at_idx" ON "paginas" USING btree ("updated_at");
  CREATE INDEX "paginas_created_at_idx" ON "paginas" USING btree ("created_at");
  CREATE INDEX "paginas_deleted_at_idx" ON "paginas" USING btree ("deleted_at");
  CREATE INDEX "paginas__status_idx" ON "paginas" USING btree ("_status");
  CREATE INDEX "paginas_rels_order_idx" ON "paginas_rels" USING btree ("order");
  CREATE INDEX "paginas_rels_parent_idx" ON "paginas_rels" USING btree ("parent_id");
  CREATE INDEX "paginas_rels_path_idx" ON "paginas_rels" USING btree ("path");
  CREATE INDEX "paginas_rels_paginas_id_idx" ON "paginas_rels" USING btree ("paginas_id");
  CREATE INDEX "paginas_rels_noticias_id_idx" ON "paginas_rels" USING btree ("noticias_id");
  CREATE INDEX "paginas_rels_etapas_id_idx" ON "paginas_rels" USING btree ("etapas_id");
  CREATE INDEX "paginas_rels_temporadas_id_idx" ON "paginas_rels" USING btree ("temporadas_id");
  CREATE INDEX "paginas_rels_categorias_id_idx" ON "paginas_rels" USING btree ("categorias_id");
  CREATE INDEX "paginas_rels_pilotos_id_idx" ON "paginas_rels" USING btree ("pilotos_id");
  CREATE INDEX "paginas_rels_galerias_id_idx" ON "paginas_rels" USING btree ("galerias_id");
  CREATE INDEX "paginas_rels_documentos_id_idx" ON "paginas_rels" USING btree ("documentos_id");
  CREATE INDEX "paginas_rels_eventos_id_idx" ON "paginas_rels" USING btree ("eventos_id");
  CREATE INDEX "_paginas_v_blocks_texto_order_idx" ON "_paginas_v_blocks_texto" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_texto_parent_id_idx" ON "_paginas_v_blocks_texto" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_texto_path_idx" ON "_paginas_v_blocks_texto" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_imagem_order_idx" ON "_paginas_v_blocks_imagem" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_imagem_parent_id_idx" ON "_paginas_v_blocks_imagem" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_imagem_path_idx" ON "_paginas_v_blocks_imagem" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_imagem_imagem_idx" ON "_paginas_v_blocks_imagem" USING btree ("imagem_id");
  CREATE INDEX "_paginas_v_blocks_galeria_order_idx" ON "_paginas_v_blocks_galeria" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_galeria_parent_id_idx" ON "_paginas_v_blocks_galeria" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_galeria_path_idx" ON "_paginas_v_blocks_galeria" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_galeria_galeria_idx" ON "_paginas_v_blocks_galeria" USING btree ("galeria_id");
  CREATE INDEX "_paginas_v_blocks_botao_order_idx" ON "_paginas_v_blocks_botao" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_botao_parent_id_idx" ON "_paginas_v_blocks_botao" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_botao_path_idx" ON "_paginas_v_blocks_botao" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_video_order_idx" ON "_paginas_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_video_parent_id_idx" ON "_paginas_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_video_path_idx" ON "_paginas_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_documento_order_idx" ON "_paginas_v_blocks_documento" USING btree ("_order");
  CREATE INDEX "_paginas_v_blocks_documento_parent_id_idx" ON "_paginas_v_blocks_documento" USING btree ("_parent_id");
  CREATE INDEX "_paginas_v_blocks_documento_path_idx" ON "_paginas_v_blocks_documento" USING btree ("_path");
  CREATE INDEX "_paginas_v_blocks_documento_documento_idx" ON "_paginas_v_blocks_documento" USING btree ("documento_id");
  CREATE INDEX "_paginas_v_parent_idx" ON "_paginas_v" USING btree ("parent_id");
  CREATE INDEX "_paginas_v_version_version__order_idx" ON "_paginas_v" USING btree ("version__order");
  CREATE INDEX "_paginas_v_version_version_imagem_topo_idx" ON "_paginas_v" USING btree ("version_imagem_topo_id");
  CREATE INDEX "_paginas_v_version_version_slug_idx" ON "_paginas_v" USING btree ("version_slug");
  CREATE INDEX "_paginas_v_version_version_visibilidade_idx" ON "_paginas_v" USING btree ("version_visibilidade");
  CREATE INDEX "_paginas_v_version_version_publicar_em_idx" ON "_paginas_v" USING btree ("version_publicar_em");
  CREATE INDEX "_paginas_v_version_version_texto_busca_idx" ON "_paginas_v" USING btree ("version_texto_busca");
  CREATE INDEX "_paginas_v_version_version_updated_at_idx" ON "_paginas_v" USING btree ("version_updated_at");
  CREATE INDEX "_paginas_v_version_version_created_at_idx" ON "_paginas_v" USING btree ("version_created_at");
  CREATE INDEX "_paginas_v_version_version_deleted_at_idx" ON "_paginas_v" USING btree ("version_deleted_at");
  CREATE INDEX "_paginas_v_version_version__status_idx" ON "_paginas_v" USING btree ("version__status");
  CREATE INDEX "_paginas_v_created_at_idx" ON "_paginas_v" USING btree ("created_at");
  CREATE INDEX "_paginas_v_updated_at_idx" ON "_paginas_v" USING btree ("updated_at");
  CREATE INDEX "_paginas_v_latest_idx" ON "_paginas_v" USING btree ("latest");
  CREATE INDEX "_paginas_v_autosave_idx" ON "_paginas_v" USING btree ("autosave");
  CREATE INDEX "_paginas_v_rels_order_idx" ON "_paginas_v_rels" USING btree ("order");
  CREATE INDEX "_paginas_v_rels_parent_idx" ON "_paginas_v_rels" USING btree ("parent_id");
  CREATE INDEX "_paginas_v_rels_path_idx" ON "_paginas_v_rels" USING btree ("path");
  CREATE INDEX "_paginas_v_rels_paginas_id_idx" ON "_paginas_v_rels" USING btree ("paginas_id");
  CREATE INDEX "_paginas_v_rels_noticias_id_idx" ON "_paginas_v_rels" USING btree ("noticias_id");
  CREATE INDEX "_paginas_v_rels_etapas_id_idx" ON "_paginas_v_rels" USING btree ("etapas_id");
  CREATE INDEX "_paginas_v_rels_temporadas_id_idx" ON "_paginas_v_rels" USING btree ("temporadas_id");
  CREATE INDEX "_paginas_v_rels_categorias_id_idx" ON "_paginas_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_paginas_v_rels_pilotos_id_idx" ON "_paginas_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "_paginas_v_rels_galerias_id_idx" ON "_paginas_v_rels" USING btree ("galerias_id");
  CREATE INDEX "_paginas_v_rels_documentos_id_idx" ON "_paginas_v_rels" USING btree ("documentos_id");
  CREATE INDEX "_paginas_v_rels_eventos_id_idx" ON "_paginas_v_rels" USING btree ("eventos_id");
  CREATE INDEX "perguntas__order_idx" ON "perguntas" USING btree ("_order");
  CREATE INDEX "perguntas_visibilidade_idx" ON "perguntas" USING btree ("visibilidade");
  CREATE INDEX "perguntas_texto_busca_idx" ON "perguntas" USING btree ("texto_busca");
  CREATE INDEX "perguntas_updated_at_idx" ON "perguntas" USING btree ("updated_at");
  CREATE INDEX "perguntas_created_at_idx" ON "perguntas" USING btree ("created_at");
  CREATE INDEX "perguntas_deleted_at_idx" ON "perguntas" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "categorias_noticia_slug_idx" ON "categorias_noticia" USING btree ("slug");
  CREATE INDEX "categorias_noticia_updated_at_idx" ON "categorias_noticia" USING btree ("updated_at");
  CREATE INDEX "categorias_noticia_created_at_idx" ON "categorias_noticia" USING btree ("created_at");
  CREATE UNIQUE INDEX "tags_slug_idx" ON "tags" USING btree ("slug");
  CREATE INDEX "tags_updated_at_idx" ON "tags" USING btree ("updated_at");
  CREATE INDEX "tags_created_at_idx" ON "tags" USING btree ("created_at");
  CREATE INDEX "tipos_documento__order_idx" ON "tipos_documento" USING btree ("_order");
  CREATE UNIQUE INDEX "tipos_documento_slug_idx" ON "tipos_documento" USING btree ("slug");
  CREATE INDEX "tipos_documento_updated_at_idx" ON "tipos_documento" USING btree ("updated_at");
  CREATE INDEX "tipos_documento_created_at_idx" ON "tipos_documento" USING btree ("created_at");
  CREATE INDEX "usuarios_sessions_order_idx" ON "usuarios_sessions" USING btree ("_order");
  CREATE INDEX "usuarios_sessions_parent_id_idx" ON "usuarios_sessions" USING btree ("_parent_id");
  CREATE INDEX "usuarios_updated_at_idx" ON "usuarios" USING btree ("updated_at");
  CREATE INDEX "usuarios_created_at_idx" ON "usuarios" USING btree ("created_at");
  CREATE UNIQUE INDEX "usuarios_email_idx" ON "usuarios" USING btree ("email");
  CREATE INDEX "atividades_usuario_idx" ON "atividades" USING btree ("usuario_id");
  CREATE INDEX "atividades_acao_idx" ON "atividades" USING btree ("acao");
  CREATE INDEX "atividades_onde_idx" ON "atividades" USING btree ("onde");
  CREATE INDEX "atividades_updated_at_idx" ON "atividades" USING btree ("updated_at");
  CREATE INDEX "atividades_created_at_idx" ON "atividades" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_folders_folder_type_order_idx" ON "payload_folders_folder_type" USING btree ("order");
  CREATE INDEX "payload_folders_folder_type_parent_idx" ON "payload_folders_folder_type" USING btree ("parent_id");
  CREATE INDEX "payload_folders_name_idx" ON "payload_folders" USING btree ("name");
  CREATE INDEX "payload_folders_folder_idx" ON "payload_folders" USING btree ("folder_id");
  CREATE INDEX "payload_folders_updated_at_idx" ON "payload_folders" USING btree ("updated_at");
  CREATE INDEX "payload_folders_created_at_idx" ON "payload_folders" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_etapas_id_idx" ON "payload_locked_documents_rels" USING btree ("etapas_id");
  CREATE INDEX "payload_locked_documents_rels_corridas_id_idx" ON "payload_locked_documents_rels" USING btree ("corridas_id");
  CREATE INDEX "payload_locked_documents_rels_temporada_categorias_id_idx" ON "payload_locked_documents_rels" USING btree ("temporada_categorias_id");
  CREATE INDEX "payload_locked_documents_rels_pilotos_id_idx" ON "payload_locked_documents_rels" USING btree ("pilotos_id");
  CREATE INDEX "payload_locked_documents_rels_inscricoes_id_idx" ON "payload_locked_documents_rels" USING btree ("inscricoes_id");
  CREATE INDEX "payload_locked_documents_rels_equipes_id_idx" ON "payload_locked_documents_rels" USING btree ("equipes_id");
  CREATE INDEX "payload_locked_documents_rels_categorias_id_idx" ON "payload_locked_documents_rels" USING btree ("categorias_id");
  CREATE INDEX "payload_locked_documents_rels_temporadas_id_idx" ON "payload_locked_documents_rels" USING btree ("temporadas_id");
  CREATE INDEX "payload_locked_documents_rels_campeonatos_id_idx" ON "payload_locked_documents_rels" USING btree ("campeonatos_id");
  CREATE INDEX "payload_locked_documents_rels_regras_pontuacao_id_idx" ON "payload_locked_documents_rels" USING btree ("regras_pontuacao_id");
  CREATE INDEX "payload_locked_documents_rels_treinos_id_idx" ON "payload_locked_documents_rels" USING btree ("treinos_id");
  CREATE INDEX "payload_locked_documents_rels_horarios_treino_id_idx" ON "payload_locked_documents_rels" USING btree ("horarios_treino_id");
  CREATE INDEX "payload_locked_documents_rels_tipos_treino_id_idx" ON "payload_locked_documents_rels" USING btree ("tipos_treino_id");
  CREATE INDEX "payload_locked_documents_rels_noticias_id_idx" ON "payload_locked_documents_rels" USING btree ("noticias_id");
  CREATE INDEX "payload_locked_documents_rels_avisos_id_idx" ON "payload_locked_documents_rels" USING btree ("avisos_id");
  CREATE INDEX "payload_locked_documents_rels_banners_id_idx" ON "payload_locked_documents_rels" USING btree ("banners_id");
  CREATE INDEX "payload_locked_documents_rels_galerias_id_idx" ON "payload_locked_documents_rels" USING btree ("galerias_id");
  CREATE INDEX "payload_locked_documents_rels_midia_id_idx" ON "payload_locked_documents_rels" USING btree ("midia_id");
  CREATE INDEX "payload_locked_documents_rels_documentos_id_idx" ON "payload_locked_documents_rels" USING btree ("documentos_id");
  CREATE INDEX "payload_locked_documents_rels_eventos_id_idx" ON "payload_locked_documents_rels" USING btree ("eventos_id");
  CREATE INDEX "payload_locked_documents_rels_paginas_id_idx" ON "payload_locked_documents_rels" USING btree ("paginas_id");
  CREATE INDEX "payload_locked_documents_rels_perguntas_id_idx" ON "payload_locked_documents_rels" USING btree ("perguntas_id");
  CREATE INDEX "payload_locked_documents_rels_categorias_noticia_id_idx" ON "payload_locked_documents_rels" USING btree ("categorias_noticia_id");
  CREATE INDEX "payload_locked_documents_rels_tags_id_idx" ON "payload_locked_documents_rels" USING btree ("tags_id");
  CREATE INDEX "payload_locked_documents_rels_tipos_documento_id_idx" ON "payload_locked_documents_rels" USING btree ("tipos_documento_id");
  CREATE INDEX "payload_locked_documents_rels_usuarios_id_idx" ON "payload_locked_documents_rels" USING btree ("usuarios_id");
  CREATE INDEX "payload_locked_documents_rels_atividades_id_idx" ON "payload_locked_documents_rels" USING btree ("atividades_id");
  CREATE INDEX "payload_locked_documents_rels_payload_folders_id_idx" ON "payload_locked_documents_rels" USING btree ("payload_folders_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_usuarios_id_idx" ON "payload_preferences_rels" USING btree ("usuarios_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "pagina_inicial_topo_botoes_order_idx" ON "pagina_inicial_topo_botoes" USING btree ("_order");
  CREATE INDEX "pagina_inicial_topo_botoes_parent_id_idx" ON "pagina_inicial_topo_botoes" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_proxima_etapa_order_idx" ON "pagina_inicial_blocks_proxima_etapa" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_proxima_etapa_parent_id_idx" ON "pagina_inicial_blocks_proxima_etapa" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_proxima_etapa_path_idx" ON "pagina_inicial_blocks_proxima_etapa" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_lideres_order_idx" ON "pagina_inicial_blocks_lideres" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_lideres_parent_id_idx" ON "pagina_inicial_blocks_lideres" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_lideres_path_idx" ON "pagina_inicial_blocks_lideres" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_calendario_order_idx" ON "pagina_inicial_blocks_calendario" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_calendario_parent_id_idx" ON "pagina_inicial_blocks_calendario" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_calendario_path_idx" ON "pagina_inicial_blocks_calendario" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_treinos_order_idx" ON "pagina_inicial_blocks_treinos" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_treinos_parent_id_idx" ON "pagina_inicial_blocks_treinos" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_treinos_path_idx" ON "pagina_inicial_blocks_treinos" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_noticias_order_idx" ON "pagina_inicial_blocks_noticias" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_noticias_parent_id_idx" ON "pagina_inicial_blocks_noticias" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_noticias_path_idx" ON "pagina_inicial_blocks_noticias" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_comunicados_order_idx" ON "pagina_inicial_blocks_comunicados" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_comunicados_parent_id_idx" ON "pagina_inicial_blocks_comunicados" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_comunicados_path_idx" ON "pagina_inicial_blocks_comunicados" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_pilotos_order_idx" ON "pagina_inicial_blocks_pilotos" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_pilotos_parent_id_idx" ON "pagina_inicial_blocks_pilotos" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_pilotos_path_idx" ON "pagina_inicial_blocks_pilotos" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_galeria_destaque_order_idx" ON "pagina_inicial_blocks_galeria_destaque" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_galeria_destaque_parent_id_idx" ON "pagina_inicial_blocks_galeria_destaque" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_galeria_destaque_path_idx" ON "pagina_inicial_blocks_galeria_destaque" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_galeria_destaque_galeria_idx" ON "pagina_inicial_blocks_galeria_destaque" USING btree ("galeria_id");
  CREATE INDEX "pagina_inicial_blocks_kartodromo_order_idx" ON "pagina_inicial_blocks_kartodromo" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_kartodromo_parent_id_idx" ON "pagina_inicial_blocks_kartodromo" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_kartodromo_path_idx" ON "pagina_inicial_blocks_kartodromo" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_ingressos_order_idx" ON "pagina_inicial_blocks_ingressos" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_ingressos_parent_id_idx" ON "pagina_inicial_blocks_ingressos" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_ingressos_path_idx" ON "pagina_inicial_blocks_ingressos" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_perguntas_order_idx" ON "pagina_inicial_blocks_perguntas" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_perguntas_parent_id_idx" ON "pagina_inicial_blocks_perguntas" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_perguntas_path_idx" ON "pagina_inicial_blocks_perguntas" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_contato_order_idx" ON "pagina_inicial_blocks_contato" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_contato_parent_id_idx" ON "pagina_inicial_blocks_contato" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_contato_path_idx" ON "pagina_inicial_blocks_contato" USING btree ("_path");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_apoiadores_order_idx" ON "pagina_inicial_blocks_apoiadores_apoiadores" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_apoiadores_parent_id_idx" ON "pagina_inicial_blocks_apoiadores_apoiadores" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_apoiadores_logo_idx" ON "pagina_inicial_blocks_apoiadores_apoiadores" USING btree ("logo_id");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_order_idx" ON "pagina_inicial_blocks_apoiadores" USING btree ("_order");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_parent_id_idx" ON "pagina_inicial_blocks_apoiadores" USING btree ("_parent_id");
  CREATE INDEX "pagina_inicial_blocks_apoiadores_path_idx" ON "pagina_inicial_blocks_apoiadores" USING btree ("_path");
  CREATE INDEX "pagina_inicial_topo_topo_imagem_idx" ON "pagina_inicial" USING btree ("topo_imagem_id");
  CREATE INDEX "pagina_inicial_rels_order_idx" ON "pagina_inicial_rels" USING btree ("order");
  CREATE INDEX "pagina_inicial_rels_parent_idx" ON "pagina_inicial_rels" USING btree ("parent_id");
  CREATE INDEX "pagina_inicial_rels_path_idx" ON "pagina_inicial_rels" USING btree ("path");
  CREATE INDEX "pagina_inicial_rels_paginas_id_idx" ON "pagina_inicial_rels" USING btree ("paginas_id");
  CREATE INDEX "pagina_inicial_rels_noticias_id_idx" ON "pagina_inicial_rels" USING btree ("noticias_id");
  CREATE INDEX "pagina_inicial_rels_etapas_id_idx" ON "pagina_inicial_rels" USING btree ("etapas_id");
  CREATE INDEX "pagina_inicial_rels_temporadas_id_idx" ON "pagina_inicial_rels" USING btree ("temporadas_id");
  CREATE INDEX "pagina_inicial_rels_categorias_id_idx" ON "pagina_inicial_rels" USING btree ("categorias_id");
  CREATE INDEX "pagina_inicial_rels_pilotos_id_idx" ON "pagina_inicial_rels" USING btree ("pilotos_id");
  CREATE INDEX "pagina_inicial_rels_galerias_id_idx" ON "pagina_inicial_rels" USING btree ("galerias_id");
  CREATE INDEX "pagina_inicial_rels_documentos_id_idx" ON "pagina_inicial_rels" USING btree ("documentos_id");
  CREATE INDEX "pagina_inicial_rels_eventos_id_idx" ON "pagina_inicial_rels" USING btree ("eventos_id");
  CREATE INDEX "_pagina_inicial_v_version_topo_botoes_order_idx" ON "_pagina_inicial_v_version_topo_botoes" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_version_topo_botoes_parent_id_idx" ON "_pagina_inicial_v_version_topo_botoes" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_proxima_etapa_order_idx" ON "_pagina_inicial_v_blocks_proxima_etapa" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_proxima_etapa_parent_id_idx" ON "_pagina_inicial_v_blocks_proxima_etapa" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_proxima_etapa_path_idx" ON "_pagina_inicial_v_blocks_proxima_etapa" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_lideres_order_idx" ON "_pagina_inicial_v_blocks_lideres" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_lideres_parent_id_idx" ON "_pagina_inicial_v_blocks_lideres" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_lideres_path_idx" ON "_pagina_inicial_v_blocks_lideres" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_calendario_order_idx" ON "_pagina_inicial_v_blocks_calendario" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_calendario_parent_id_idx" ON "_pagina_inicial_v_blocks_calendario" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_calendario_path_idx" ON "_pagina_inicial_v_blocks_calendario" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_treinos_order_idx" ON "_pagina_inicial_v_blocks_treinos" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_treinos_parent_id_idx" ON "_pagina_inicial_v_blocks_treinos" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_treinos_path_idx" ON "_pagina_inicial_v_blocks_treinos" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_noticias_order_idx" ON "_pagina_inicial_v_blocks_noticias" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_noticias_parent_id_idx" ON "_pagina_inicial_v_blocks_noticias" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_noticias_path_idx" ON "_pagina_inicial_v_blocks_noticias" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_comunicados_order_idx" ON "_pagina_inicial_v_blocks_comunicados" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_comunicados_parent_id_idx" ON "_pagina_inicial_v_blocks_comunicados" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_comunicados_path_idx" ON "_pagina_inicial_v_blocks_comunicados" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_pilotos_order_idx" ON "_pagina_inicial_v_blocks_pilotos" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_pilotos_parent_id_idx" ON "_pagina_inicial_v_blocks_pilotos" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_pilotos_path_idx" ON "_pagina_inicial_v_blocks_pilotos" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_galeria_destaque_order_idx" ON "_pagina_inicial_v_blocks_galeria_destaque" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_galeria_destaque_parent_id_idx" ON "_pagina_inicial_v_blocks_galeria_destaque" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_galeria_destaque_path_idx" ON "_pagina_inicial_v_blocks_galeria_destaque" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_galeria_destaque_galeria_idx" ON "_pagina_inicial_v_blocks_galeria_destaque" USING btree ("galeria_id");
  CREATE INDEX "_pagina_inicial_v_blocks_kartodromo_order_idx" ON "_pagina_inicial_v_blocks_kartodromo" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_kartodromo_parent_id_idx" ON "_pagina_inicial_v_blocks_kartodromo" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_kartodromo_path_idx" ON "_pagina_inicial_v_blocks_kartodromo" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_ingressos_order_idx" ON "_pagina_inicial_v_blocks_ingressos" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_ingressos_parent_id_idx" ON "_pagina_inicial_v_blocks_ingressos" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_ingressos_path_idx" ON "_pagina_inicial_v_blocks_ingressos" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_perguntas_order_idx" ON "_pagina_inicial_v_blocks_perguntas" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_perguntas_parent_id_idx" ON "_pagina_inicial_v_blocks_perguntas" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_perguntas_path_idx" ON "_pagina_inicial_v_blocks_perguntas" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_contato_order_idx" ON "_pagina_inicial_v_blocks_contato" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_contato_parent_id_idx" ON "_pagina_inicial_v_blocks_contato" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_contato_path_idx" ON "_pagina_inicial_v_blocks_contato" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_apoiadores_order_idx" ON "_pagina_inicial_v_blocks_apoiadores_apoiadores" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_apoiadores_parent_id_idx" ON "_pagina_inicial_v_blocks_apoiadores_apoiadores" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_apoiadores_logo_idx" ON "_pagina_inicial_v_blocks_apoiadores_apoiadores" USING btree ("logo_id");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_order_idx" ON "_pagina_inicial_v_blocks_apoiadores" USING btree ("_order");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_parent_id_idx" ON "_pagina_inicial_v_blocks_apoiadores" USING btree ("_parent_id");
  CREATE INDEX "_pagina_inicial_v_blocks_apoiadores_path_idx" ON "_pagina_inicial_v_blocks_apoiadores" USING btree ("_path");
  CREATE INDEX "_pagina_inicial_v_version_topo_version_topo_imagem_idx" ON "_pagina_inicial_v" USING btree ("version_topo_imagem_id");
  CREATE INDEX "_pagina_inicial_v_created_at_idx" ON "_pagina_inicial_v" USING btree ("created_at");
  CREATE INDEX "_pagina_inicial_v_updated_at_idx" ON "_pagina_inicial_v" USING btree ("updated_at");
  CREATE INDEX "_pagina_inicial_v_rels_order_idx" ON "_pagina_inicial_v_rels" USING btree ("order");
  CREATE INDEX "_pagina_inicial_v_rels_parent_idx" ON "_pagina_inicial_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pagina_inicial_v_rels_path_idx" ON "_pagina_inicial_v_rels" USING btree ("path");
  CREATE INDEX "_pagina_inicial_v_rels_paginas_id_idx" ON "_pagina_inicial_v_rels" USING btree ("paginas_id");
  CREATE INDEX "_pagina_inicial_v_rels_noticias_id_idx" ON "_pagina_inicial_v_rels" USING btree ("noticias_id");
  CREATE INDEX "_pagina_inicial_v_rels_etapas_id_idx" ON "_pagina_inicial_v_rels" USING btree ("etapas_id");
  CREATE INDEX "_pagina_inicial_v_rels_temporadas_id_idx" ON "_pagina_inicial_v_rels" USING btree ("temporadas_id");
  CREATE INDEX "_pagina_inicial_v_rels_categorias_id_idx" ON "_pagina_inicial_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_pagina_inicial_v_rels_pilotos_id_idx" ON "_pagina_inicial_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "_pagina_inicial_v_rels_galerias_id_idx" ON "_pagina_inicial_v_rels" USING btree ("galerias_id");
  CREATE INDEX "_pagina_inicial_v_rels_documentos_id_idx" ON "_pagina_inicial_v_rels" USING btree ("documentos_id");
  CREATE INDEX "_pagina_inicial_v_rels_eventos_id_idx" ON "_pagina_inicial_v_rels" USING btree ("eventos_id");
  CREATE INDEX "kartodromo_taxas_order_idx" ON "kartodromo_taxas" USING btree ("_order");
  CREATE INDEX "kartodromo_taxas_parent_id_idx" ON "kartodromo_taxas" USING btree ("_parent_id");
  CREATE INDEX "kartodromo_como_treinar_order_idx" ON "kartodromo_como_treinar" USING btree ("_order");
  CREATE INDEX "kartodromo_como_treinar_parent_id_idx" ON "kartodromo_como_treinar" USING btree ("_parent_id");
  CREATE INDEX "kartodromo_estrutura_order_idx" ON "kartodromo_estrutura" USING btree ("_order");
  CREATE INDEX "kartodromo_estrutura_parent_id_idx" ON "kartodromo_estrutura" USING btree ("_parent_id");
  CREATE INDEX "kartodromo_estrutura_imagem_idx" ON "kartodromo_estrutura" USING btree ("imagem_id");
  CREATE INDEX "kartodromo_dados_pista_order_idx" ON "kartodromo_dados_pista" USING btree ("_order");
  CREATE INDEX "kartodromo_dados_pista_parent_id_idx" ON "kartodromo_dados_pista" USING btree ("_parent_id");
  CREATE INDEX "kartodromo_imagem_topo_idx" ON "kartodromo" USING btree ("imagem_topo_id");
  CREATE INDEX "kartodromo_tracado_idx" ON "kartodromo" USING btree ("tracado_id");
  CREATE INDEX "kartodromo_rels_order_idx" ON "kartodromo_rels" USING btree ("order");
  CREATE INDEX "kartodromo_rels_parent_idx" ON "kartodromo_rels" USING btree ("parent_id");
  CREATE INDEX "kartodromo_rels_path_idx" ON "kartodromo_rels" USING btree ("path");
  CREATE INDEX "kartodromo_rels_galerias_id_idx" ON "kartodromo_rels" USING btree ("galerias_id");
  CREATE INDEX "_kartodromo_v_version_taxas_order_idx" ON "_kartodromo_v_version_taxas" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_taxas_parent_id_idx" ON "_kartodromo_v_version_taxas" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_como_treinar_order_idx" ON "_kartodromo_v_version_como_treinar" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_como_treinar_parent_id_idx" ON "_kartodromo_v_version_como_treinar" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_estrutura_order_idx" ON "_kartodromo_v_version_estrutura" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_estrutura_parent_id_idx" ON "_kartodromo_v_version_estrutura" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_estrutura_imagem_idx" ON "_kartodromo_v_version_estrutura" USING btree ("imagem_id");
  CREATE INDEX "_kartodromo_v_version_dados_pista_order_idx" ON "_kartodromo_v_version_dados_pista" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_dados_pista_parent_id_idx" ON "_kartodromo_v_version_dados_pista" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_version_imagem_topo_idx" ON "_kartodromo_v" USING btree ("version_imagem_topo_id");
  CREATE INDEX "_kartodromo_v_version_version_tracado_idx" ON "_kartodromo_v" USING btree ("version_tracado_id");
  CREATE INDEX "_kartodromo_v_created_at_idx" ON "_kartodromo_v" USING btree ("created_at");
  CREATE INDEX "_kartodromo_v_updated_at_idx" ON "_kartodromo_v" USING btree ("updated_at");
  CREATE INDEX "_kartodromo_v_rels_order_idx" ON "_kartodromo_v_rels" USING btree ("order");
  CREATE INDEX "_kartodromo_v_rels_parent_idx" ON "_kartodromo_v_rels" USING btree ("parent_id");
  CREATE INDEX "_kartodromo_v_rels_path_idx" ON "_kartodromo_v_rels" USING btree ("path");
  CREATE INDEX "_kartodromo_v_rels_galerias_id_idx" ON "_kartodromo_v_rels" USING btree ("galerias_id");
  CREATE INDEX "contato_canais_exibir_em_order_idx" ON "contato_canais_exibir_em" USING btree ("order");
  CREATE INDEX "contato_canais_exibir_em_parent_idx" ON "contato_canais_exibir_em" USING btree ("parent_id");
  CREATE INDEX "contato_canais_order_idx" ON "contato_canais" USING btree ("_order");
  CREATE INDEX "contato_canais_parent_id_idx" ON "contato_canais" USING btree ("_parent_id");
  CREATE INDEX "contato_horarios_order_idx" ON "contato_horarios" USING btree ("_order");
  CREATE INDEX "contato_horarios_parent_id_idx" ON "contato_horarios" USING btree ("_parent_id");
  CREATE INDEX "contato_redes_order_idx" ON "contato_redes" USING btree ("_order");
  CREATE INDEX "contato_redes_parent_id_idx" ON "contato_redes" USING btree ("_parent_id");
  CREATE INDEX "contato_endereco_endereco_imagem_mapa_idx" ON "contato" USING btree ("endereco_imagem_mapa_id");
  CREATE INDEX "_contato_v_version_canais_exibir_em_order_idx" ON "_contato_v_version_canais_exibir_em" USING btree ("order");
  CREATE INDEX "_contato_v_version_canais_exibir_em_parent_idx" ON "_contato_v_version_canais_exibir_em" USING btree ("parent_id");
  CREATE INDEX "_contato_v_version_canais_order_idx" ON "_contato_v_version_canais" USING btree ("_order");
  CREATE INDEX "_contato_v_version_canais_parent_id_idx" ON "_contato_v_version_canais" USING btree ("_parent_id");
  CREATE INDEX "_contato_v_version_horarios_order_idx" ON "_contato_v_version_horarios" USING btree ("_order");
  CREATE INDEX "_contato_v_version_horarios_parent_id_idx" ON "_contato_v_version_horarios" USING btree ("_parent_id");
  CREATE INDEX "_contato_v_version_redes_order_idx" ON "_contato_v_version_redes" USING btree ("_order");
  CREATE INDEX "_contato_v_version_redes_parent_id_idx" ON "_contato_v_version_redes" USING btree ("_parent_id");
  CREATE INDEX "_contato_v_version_endereco_version_endereco_imagem_mapa_idx" ON "_contato_v" USING btree ("version_endereco_imagem_mapa_id");
  CREATE INDEX "_contato_v_created_at_idx" ON "_contato_v" USING btree ("created_at");
  CREATE INDEX "_contato_v_updated_at_idx" ON "_contato_v" USING btree ("updated_at");
  CREATE INDEX "institucional_pilares_order_idx" ON "institucional_pilares" USING btree ("_order");
  CREATE INDEX "institucional_pilares_parent_id_idx" ON "institucional_pilares" USING btree ("_parent_id");
  CREATE INDEX "institucional_marcos_order_idx" ON "institucional_marcos" USING btree ("_order");
  CREATE INDEX "institucional_marcos_parent_id_idx" ON "institucional_marcos" USING btree ("_parent_id");
  CREATE INDEX "institucional_diretoria_order_idx" ON "institucional_diretoria" USING btree ("_order");
  CREATE INDEX "institucional_diretoria_parent_id_idx" ON "institucional_diretoria" USING btree ("_parent_id");
  CREATE INDEX "institucional_diretoria_foto_idx" ON "institucional_diretoria" USING btree ("foto_id");
  CREATE INDEX "institucional_imagem_topo_idx" ON "institucional" USING btree ("imagem_topo_id");
  CREATE INDEX "institucional_galeria_idx" ON "institucional" USING btree ("galeria_id");
  CREATE INDEX "institucional_rels_order_idx" ON "institucional_rels" USING btree ("order");
  CREATE INDEX "institucional_rels_parent_idx" ON "institucional_rels" USING btree ("parent_id");
  CREATE INDEX "institucional_rels_path_idx" ON "institucional_rels" USING btree ("path");
  CREATE INDEX "institucional_rels_documentos_id_idx" ON "institucional_rels" USING btree ("documentos_id");
  CREATE INDEX "_institucional_v_version_pilares_order_idx" ON "_institucional_v_version_pilares" USING btree ("_order");
  CREATE INDEX "_institucional_v_version_pilares_parent_id_idx" ON "_institucional_v_version_pilares" USING btree ("_parent_id");
  CREATE INDEX "_institucional_v_version_marcos_order_idx" ON "_institucional_v_version_marcos" USING btree ("_order");
  CREATE INDEX "_institucional_v_version_marcos_parent_id_idx" ON "_institucional_v_version_marcos" USING btree ("_parent_id");
  CREATE INDEX "_institucional_v_version_diretoria_order_idx" ON "_institucional_v_version_diretoria" USING btree ("_order");
  CREATE INDEX "_institucional_v_version_diretoria_parent_id_idx" ON "_institucional_v_version_diretoria" USING btree ("_parent_id");
  CREATE INDEX "_institucional_v_version_diretoria_foto_idx" ON "_institucional_v_version_diretoria" USING btree ("foto_id");
  CREATE INDEX "_institucional_v_version_version_imagem_topo_idx" ON "_institucional_v" USING btree ("version_imagem_topo_id");
  CREATE INDEX "_institucional_v_version_version_galeria_idx" ON "_institucional_v" USING btree ("version_galeria_id");
  CREATE INDEX "_institucional_v_created_at_idx" ON "_institucional_v" USING btree ("created_at");
  CREATE INDEX "_institucional_v_updated_at_idx" ON "_institucional_v" USING btree ("updated_at");
  CREATE INDEX "_institucional_v_rels_order_idx" ON "_institucional_v_rels" USING btree ("order");
  CREATE INDEX "_institucional_v_rels_parent_idx" ON "_institucional_v_rels" USING btree ("parent_id");
  CREATE INDEX "_institucional_v_rels_path_idx" ON "_institucional_v_rels" USING btree ("path");
  CREATE INDEX "_institucional_v_rels_documentos_id_idx" ON "_institucional_v_rels" USING btree ("documentos_id");
  CREATE INDEX "textos_paginas_paginas_order_idx" ON "textos_paginas_paginas" USING btree ("_order");
  CREATE INDEX "textos_paginas_paginas_parent_id_idx" ON "textos_paginas_paginas" USING btree ("_parent_id");
  CREATE INDEX "textos_paginas_paginas_imagem_idx" ON "textos_paginas_paginas" USING btree ("imagem_id");
  CREATE INDEX "_textos_paginas_v_version_paginas_order_idx" ON "_textos_paginas_v_version_paginas" USING btree ("_order");
  CREATE INDEX "_textos_paginas_v_version_paginas_parent_id_idx" ON "_textos_paginas_v_version_paginas" USING btree ("_parent_id");
  CREATE INDEX "_textos_paginas_v_version_paginas_imagem_idx" ON "_textos_paginas_v_version_paginas" USING btree ("imagem_id");
  CREATE INDEX "_textos_paginas_v_created_at_idx" ON "_textos_paginas_v" USING btree ("created_at");
  CREATE INDEX "_textos_paginas_v_updated_at_idx" ON "_textos_paginas_v" USING btree ("updated_at");
  CREATE INDEX "navegacao_menu_subitens_order_idx" ON "navegacao_menu_subitens" USING btree ("_order");
  CREATE INDEX "navegacao_menu_subitens_parent_id_idx" ON "navegacao_menu_subitens" USING btree ("_parent_id");
  CREATE INDEX "navegacao_menu_order_idx" ON "navegacao_menu" USING btree ("_order");
  CREATE INDEX "navegacao_menu_parent_id_idx" ON "navegacao_menu" USING btree ("_parent_id");
  CREATE INDEX "navegacao_rodape_links_order_idx" ON "navegacao_rodape_links" USING btree ("_order");
  CREATE INDEX "navegacao_rodape_links_parent_id_idx" ON "navegacao_rodape_links" USING btree ("_parent_id");
  CREATE INDEX "navegacao_rodape_order_idx" ON "navegacao_rodape" USING btree ("_order");
  CREATE INDEX "navegacao_rodape_parent_id_idx" ON "navegacao_rodape" USING btree ("_parent_id");
  CREATE INDEX "navegacao_rels_order_idx" ON "navegacao_rels" USING btree ("order");
  CREATE INDEX "navegacao_rels_parent_idx" ON "navegacao_rels" USING btree ("parent_id");
  CREATE INDEX "navegacao_rels_path_idx" ON "navegacao_rels" USING btree ("path");
  CREATE INDEX "navegacao_rels_paginas_id_idx" ON "navegacao_rels" USING btree ("paginas_id");
  CREATE INDEX "navegacao_rels_noticias_id_idx" ON "navegacao_rels" USING btree ("noticias_id");
  CREATE INDEX "navegacao_rels_etapas_id_idx" ON "navegacao_rels" USING btree ("etapas_id");
  CREATE INDEX "navegacao_rels_temporadas_id_idx" ON "navegacao_rels" USING btree ("temporadas_id");
  CREATE INDEX "navegacao_rels_categorias_id_idx" ON "navegacao_rels" USING btree ("categorias_id");
  CREATE INDEX "navegacao_rels_pilotos_id_idx" ON "navegacao_rels" USING btree ("pilotos_id");
  CREATE INDEX "navegacao_rels_galerias_id_idx" ON "navegacao_rels" USING btree ("galerias_id");
  CREATE INDEX "navegacao_rels_documentos_id_idx" ON "navegacao_rels" USING btree ("documentos_id");
  CREATE INDEX "navegacao_rels_eventos_id_idx" ON "navegacao_rels" USING btree ("eventos_id");
  CREATE INDEX "_navegacao_v_version_menu_subitens_order_idx" ON "_navegacao_v_version_menu_subitens" USING btree ("_order");
  CREATE INDEX "_navegacao_v_version_menu_subitens_parent_id_idx" ON "_navegacao_v_version_menu_subitens" USING btree ("_parent_id");
  CREATE INDEX "_navegacao_v_version_menu_order_idx" ON "_navegacao_v_version_menu" USING btree ("_order");
  CREATE INDEX "_navegacao_v_version_menu_parent_id_idx" ON "_navegacao_v_version_menu" USING btree ("_parent_id");
  CREATE INDEX "_navegacao_v_version_rodape_links_order_idx" ON "_navegacao_v_version_rodape_links" USING btree ("_order");
  CREATE INDEX "_navegacao_v_version_rodape_links_parent_id_idx" ON "_navegacao_v_version_rodape_links" USING btree ("_parent_id");
  CREATE INDEX "_navegacao_v_version_rodape_order_idx" ON "_navegacao_v_version_rodape" USING btree ("_order");
  CREATE INDEX "_navegacao_v_version_rodape_parent_id_idx" ON "_navegacao_v_version_rodape" USING btree ("_parent_id");
  CREATE INDEX "_navegacao_v_created_at_idx" ON "_navegacao_v" USING btree ("created_at");
  CREATE INDEX "_navegacao_v_updated_at_idx" ON "_navegacao_v" USING btree ("updated_at");
  CREATE INDEX "_navegacao_v_rels_order_idx" ON "_navegacao_v_rels" USING btree ("order");
  CREATE INDEX "_navegacao_v_rels_parent_idx" ON "_navegacao_v_rels" USING btree ("parent_id");
  CREATE INDEX "_navegacao_v_rels_path_idx" ON "_navegacao_v_rels" USING btree ("path");
  CREATE INDEX "_navegacao_v_rels_paginas_id_idx" ON "_navegacao_v_rels" USING btree ("paginas_id");
  CREATE INDEX "_navegacao_v_rels_noticias_id_idx" ON "_navegacao_v_rels" USING btree ("noticias_id");
  CREATE INDEX "_navegacao_v_rels_etapas_id_idx" ON "_navegacao_v_rels" USING btree ("etapas_id");
  CREATE INDEX "_navegacao_v_rels_temporadas_id_idx" ON "_navegacao_v_rels" USING btree ("temporadas_id");
  CREATE INDEX "_navegacao_v_rels_categorias_id_idx" ON "_navegacao_v_rels" USING btree ("categorias_id");
  CREATE INDEX "_navegacao_v_rels_pilotos_id_idx" ON "_navegacao_v_rels" USING btree ("pilotos_id");
  CREATE INDEX "_navegacao_v_rels_galerias_id_idx" ON "_navegacao_v_rels" USING btree ("galerias_id");
  CREATE INDEX "_navegacao_v_rels_documentos_id_idx" ON "_navegacao_v_rels" USING btree ("documentos_id");
  CREATE INDEX "_navegacao_v_rels_eventos_id_idx" ON "_navegacao_v_rels" USING btree ("eventos_id");
  CREATE INDEX "configuracoes_logo_idx" ON "configuracoes" USING btree ("logo_id");
  CREATE INDEX "configuracoes_logo_fundo_escuro_idx" ON "configuracoes" USING btree ("logo_fundo_escuro_id");
  CREATE INDEX "configuracoes_favicon_idx" ON "configuracoes" USING btree ("favicon_id");
  CREATE INDEX "configuracoes_campeonato_principal_idx" ON "configuracoes" USING btree ("campeonato_principal_id");
  CREATE INDEX "configuracoes_imagem_compartilhamento_idx" ON "configuracoes" USING btree ("imagem_compartilhamento_id");
  CREATE INDEX "_configuracoes_v_version_version_logo_idx" ON "_configuracoes_v" USING btree ("version_logo_id");
  CREATE INDEX "_configuracoes_v_version_version_logo_fundo_escuro_idx" ON "_configuracoes_v" USING btree ("version_logo_fundo_escuro_id");
  CREATE INDEX "_configuracoes_v_version_version_favicon_idx" ON "_configuracoes_v" USING btree ("version_favicon_id");
  CREATE INDEX "_configuracoes_v_version_version_campeonato_principal_idx" ON "_configuracoes_v" USING btree ("version_campeonato_principal_id");
  CREATE INDEX "_configuracoes_v_version_version_imagem_compartilhamento_idx" ON "_configuracoes_v" USING btree ("version_imagem_compartilhamento_id");
  CREATE INDEX "_configuracoes_v_created_at_idx" ON "_configuracoes_v" USING btree ("created_at");
  CREATE INDEX "_configuracoes_v_updated_at_idx" ON "_configuracoes_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "etapas" CASCADE;
  DROP TABLE "etapas_rels" CASCADE;
  DROP TABLE "corridas_resultados" CASCADE;
  DROP TABLE "corridas" CASCADE;
  DROP TABLE "corridas_rels" CASCADE;
  DROP TABLE "temporada_categorias_ajustes" CASCADE;
  DROP TABLE "temporada_categorias_linhas_manuais" CASCADE;
  DROP TABLE "temporada_categorias" CASCADE;
  DROP TABLE "temporada_categorias_rels" CASCADE;
  DROP TABLE "pilotos" CASCADE;
  DROP TABLE "inscricoes" CASCADE;
  DROP TABLE "equipes" CASCADE;
  DROP TABLE "categorias" CASCADE;
  DROP TABLE "temporadas_formato_etapa" CASCADE;
  DROP TABLE "temporadas" CASCADE;
  DROP TABLE "temporadas_rels" CASCADE;
  DROP TABLE "campeonatos" CASCADE;
  DROP TABLE "regras_pontuacao_tabelas" CASCADE;
  DROP TABLE "regras_pontuacao_criterios_desempate" CASCADE;
  DROP TABLE "regras_pontuacao" CASCADE;
  DROP TABLE "regras_pontuacao_numbers" CASCADE;
  DROP TABLE "_regras_pontuacao_v_version_tabelas" CASCADE;
  DROP TABLE "_regras_pontuacao_v_version_criterios_desempate" CASCADE;
  DROP TABLE "_regras_pontuacao_v" CASCADE;
  DROP TABLE "_regras_pontuacao_v_numbers" CASCADE;
  DROP TABLE "treinos" CASCADE;
  DROP TABLE "treinos_rels" CASCADE;
  DROP TABLE "horarios_treino" CASCADE;
  DROP TABLE "horarios_treino_rels" CASCADE;
  DROP TABLE "tipos_treino" CASCADE;
  DROP TABLE "noticias" CASCADE;
  DROP TABLE "noticias_rels" CASCADE;
  DROP TABLE "_noticias_v" CASCADE;
  DROP TABLE "_noticias_v_rels" CASCADE;
  DROP TABLE "avisos" CASCADE;
  DROP TABLE "_avisos_v" CASCADE;
  DROP TABLE "banners" CASCADE;
  DROP TABLE "banners_rels" CASCADE;
  DROP TABLE "_banners_v" CASCADE;
  DROP TABLE "_banners_v_rels" CASCADE;
  DROP TABLE "galerias" CASCADE;
  DROP TABLE "galerias_rels" CASCADE;
  DROP TABLE "_galerias_v" CASCADE;
  DROP TABLE "_galerias_v_rels" CASCADE;
  DROP TABLE "midia" CASCADE;
  DROP TABLE "midia_rels" CASCADE;
  DROP TABLE "documentos" CASCADE;
  DROP TABLE "_documentos_v" CASCADE;
  DROP TABLE "eventos" CASCADE;
  DROP TABLE "eventos_rels" CASCADE;
  DROP TABLE "_eventos_v" CASCADE;
  DROP TABLE "_eventos_v_rels" CASCADE;
  DROP TABLE "paginas_blocks_texto" CASCADE;
  DROP TABLE "paginas_blocks_imagem" CASCADE;
  DROP TABLE "paginas_blocks_galeria" CASCADE;
  DROP TABLE "paginas_blocks_botao" CASCADE;
  DROP TABLE "paginas_blocks_video" CASCADE;
  DROP TABLE "paginas_blocks_documento" CASCADE;
  DROP TABLE "paginas" CASCADE;
  DROP TABLE "paginas_rels" CASCADE;
  DROP TABLE "_paginas_v_blocks_texto" CASCADE;
  DROP TABLE "_paginas_v_blocks_imagem" CASCADE;
  DROP TABLE "_paginas_v_blocks_galeria" CASCADE;
  DROP TABLE "_paginas_v_blocks_botao" CASCADE;
  DROP TABLE "_paginas_v_blocks_video" CASCADE;
  DROP TABLE "_paginas_v_blocks_documento" CASCADE;
  DROP TABLE "_paginas_v" CASCADE;
  DROP TABLE "_paginas_v_rels" CASCADE;
  DROP TABLE "perguntas" CASCADE;
  DROP TABLE "categorias_noticia" CASCADE;
  DROP TABLE "tags" CASCADE;
  DROP TABLE "tipos_documento" CASCADE;
  DROP TABLE "usuarios_sessions" CASCADE;
  DROP TABLE "usuarios" CASCADE;
  DROP TABLE "atividades" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_folders_folder_type" CASCADE;
  DROP TABLE "payload_folders" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "pagina_inicial_topo_botoes" CASCADE;
  DROP TABLE "pagina_inicial_blocks_proxima_etapa" CASCADE;
  DROP TABLE "pagina_inicial_blocks_lideres" CASCADE;
  DROP TABLE "pagina_inicial_blocks_calendario" CASCADE;
  DROP TABLE "pagina_inicial_blocks_treinos" CASCADE;
  DROP TABLE "pagina_inicial_blocks_noticias" CASCADE;
  DROP TABLE "pagina_inicial_blocks_comunicados" CASCADE;
  DROP TABLE "pagina_inicial_blocks_pilotos" CASCADE;
  DROP TABLE "pagina_inicial_blocks_galeria_destaque" CASCADE;
  DROP TABLE "pagina_inicial_blocks_kartodromo" CASCADE;
  DROP TABLE "pagina_inicial_blocks_ingressos" CASCADE;
  DROP TABLE "pagina_inicial_blocks_perguntas" CASCADE;
  DROP TABLE "pagina_inicial_blocks_contato" CASCADE;
  DROP TABLE "pagina_inicial_blocks_apoiadores_apoiadores" CASCADE;
  DROP TABLE "pagina_inicial_blocks_apoiadores" CASCADE;
  DROP TABLE "pagina_inicial" CASCADE;
  DROP TABLE "pagina_inicial_rels" CASCADE;
  DROP TABLE "_pagina_inicial_v_version_topo_botoes" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_proxima_etapa" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_lideres" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_calendario" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_treinos" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_noticias" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_comunicados" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_pilotos" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_galeria_destaque" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_kartodromo" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_ingressos" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_perguntas" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_contato" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" CASCADE;
  DROP TABLE "_pagina_inicial_v_blocks_apoiadores" CASCADE;
  DROP TABLE "_pagina_inicial_v" CASCADE;
  DROP TABLE "_pagina_inicial_v_rels" CASCADE;
  DROP TABLE "kartodromo_taxas" CASCADE;
  DROP TABLE "kartodromo_como_treinar" CASCADE;
  DROP TABLE "kartodromo_estrutura" CASCADE;
  DROP TABLE "kartodromo_dados_pista" CASCADE;
  DROP TABLE "kartodromo" CASCADE;
  DROP TABLE "kartodromo_rels" CASCADE;
  DROP TABLE "_kartodromo_v_version_taxas" CASCADE;
  DROP TABLE "_kartodromo_v_version_como_treinar" CASCADE;
  DROP TABLE "_kartodromo_v_version_estrutura" CASCADE;
  DROP TABLE "_kartodromo_v_version_dados_pista" CASCADE;
  DROP TABLE "_kartodromo_v" CASCADE;
  DROP TABLE "_kartodromo_v_rels" CASCADE;
  DROP TABLE "contato_canais_exibir_em" CASCADE;
  DROP TABLE "contato_canais" CASCADE;
  DROP TABLE "contato_horarios" CASCADE;
  DROP TABLE "contato_redes" CASCADE;
  DROP TABLE "contato" CASCADE;
  DROP TABLE "_contato_v_version_canais_exibir_em" CASCADE;
  DROP TABLE "_contato_v_version_canais" CASCADE;
  DROP TABLE "_contato_v_version_horarios" CASCADE;
  DROP TABLE "_contato_v_version_redes" CASCADE;
  DROP TABLE "_contato_v" CASCADE;
  DROP TABLE "institucional_pilares" CASCADE;
  DROP TABLE "institucional_marcos" CASCADE;
  DROP TABLE "institucional_diretoria" CASCADE;
  DROP TABLE "institucional" CASCADE;
  DROP TABLE "institucional_rels" CASCADE;
  DROP TABLE "_institucional_v_version_pilares" CASCADE;
  DROP TABLE "_institucional_v_version_marcos" CASCADE;
  DROP TABLE "_institucional_v_version_diretoria" CASCADE;
  DROP TABLE "_institucional_v" CASCADE;
  DROP TABLE "_institucional_v_rels" CASCADE;
  DROP TABLE "textos_paginas_paginas" CASCADE;
  DROP TABLE "textos_paginas" CASCADE;
  DROP TABLE "_textos_paginas_v_version_paginas" CASCADE;
  DROP TABLE "_textos_paginas_v" CASCADE;
  DROP TABLE "navegacao_menu_subitens" CASCADE;
  DROP TABLE "navegacao_menu" CASCADE;
  DROP TABLE "navegacao_rodape_links" CASCADE;
  DROP TABLE "navegacao_rodape" CASCADE;
  DROP TABLE "navegacao" CASCADE;
  DROP TABLE "navegacao_rels" CASCADE;
  DROP TABLE "_navegacao_v_version_menu_subitens" CASCADE;
  DROP TABLE "_navegacao_v_version_menu" CASCADE;
  DROP TABLE "_navegacao_v_version_rodape_links" CASCADE;
  DROP TABLE "_navegacao_v_version_rodape" CASCADE;
  DROP TABLE "_navegacao_v" CASCADE;
  DROP TABLE "_navegacao_v_rels" CASCADE;
  DROP TABLE "configuracoes" CASCADE;
  DROP TABLE "_configuracoes_v" CASCADE;
  DROP TYPE "public"."enum_etapas_inicio_tz";
  DROP TYPE "public"."enum_etapas_fim_tz";
  DROP TYPE "public"."enum_etapas_status";
  DROP TYPE "public"."enum_etapas_visibilidade";
  DROP TYPE "public"."enum_corridas_resultados_status";
  DROP TYPE "public"."enum_corridas_resultados_penalidade_tipo";
  DROP TYPE "public"."enum_corridas_tipo";
  DROP TYPE "public"."enum_corridas_status";
  DROP TYPE "public"."enum_corridas_inicio_tz";
  DROP TYPE "public"."enum_temporada_categorias_ajustes_tipo";
  DROP TYPE "public"."enum_temporada_categorias_modo";
  DROP TYPE "public"."enum_pilotos_uf";
  DROP TYPE "public"."enum_pilotos_autorizacao_imagem_autorizada";
  DROP TYPE "public"."enum_pilotos_visibilidade";
  DROP TYPE "public"."enum_inscricoes_condicao";
  DROP TYPE "public"."enum_inscricoes_status";
  DROP TYPE "public"."enum_equipes_uf";
  DROP TYPE "public"."enum_equipes_visibilidade";
  DROP TYPE "public"."enum_categorias_visibilidade";
  DROP TYPE "public"."enum_temporadas_formato_etapa_tipo";
  DROP TYPE "public"."enum_temporadas_status";
  DROP TYPE "public"."enum_temporadas_fonte_dados";
  DROP TYPE "public"."enum_temporadas_visibilidade";
  DROP TYPE "public"."enum_campeonatos_visibilidade";
  DROP TYPE "public"."enum_regras_pontuacao_criterios_desempate_criterio";
  DROP TYPE "public"."enum_regras_pontuacao_requisito_participacao";
  DROP TYPE "public"."enum_regras_pontuacao_abandono";
  DROP TYPE "public"."enum_regras_pontuacao_convidados";
  DROP TYPE "public"."enum_regras_pontuacao_descartes_unidade";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_criterios_desempate_criterio";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_requisito_participacao";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_abandono";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_convidados";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_descartes_unidade";
  DROP TYPE "public"."enum_treinos_status";
  DROP TYPE "public"."enum_treinos_hora_inicio";
  DROP TYPE "public"."enum_treinos_hora_fim";
  DROP TYPE "public"."enum_treinos_visibilidade";
  DROP TYPE "public"."enum_horarios_treino_dia_semana";
  DROP TYPE "public"."enum_horarios_treino_hora_inicio";
  DROP TYPE "public"."enum_horarios_treino_hora_fim";
  DROP TYPE "public"."enum_horarios_treino_visibilidade";
  DROP TYPE "public"."enum_noticias_visibilidade";
  DROP TYPE "public"."enum_noticias_status";
  DROP TYPE "public"."enum__noticias_v_version_visibilidade";
  DROP TYPE "public"."enum__noticias_v_version_status";
  DROP TYPE "public"."enum_avisos_tipo";
  DROP TYPE "public"."enum_avisos_nivel";
  DROP TYPE "public"."enum_avisos_visibilidade";
  DROP TYPE "public"."enum_avisos_status";
  DROP TYPE "public"."enum__avisos_v_version_tipo";
  DROP TYPE "public"."enum__avisos_v_version_nivel";
  DROP TYPE "public"."enum__avisos_v_version_visibilidade";
  DROP TYPE "public"."enum__avisos_v_version_status";
  DROP TYPE "public"."enum_banners_botao_tipo";
  DROP TYPE "public"."enum_banners_botao_rota";
  DROP TYPE "public"."enum_banners_visibilidade";
  DROP TYPE "public"."enum_banners_status";
  DROP TYPE "public"."enum__banners_v_version_botao_tipo";
  DROP TYPE "public"."enum__banners_v_version_botao_rota";
  DROP TYPE "public"."enum__banners_v_version_visibilidade";
  DROP TYPE "public"."enum__banners_v_version_status";
  DROP TYPE "public"."enum_galerias_exibicao";
  DROP TYPE "public"."enum_galerias_tipo";
  DROP TYPE "public"."enum_galerias_visibilidade";
  DROP TYPE "public"."enum_galerias_status";
  DROP TYPE "public"."enum__galerias_v_version_exibicao";
  DROP TYPE "public"."enum__galerias_v_version_tipo";
  DROP TYPE "public"."enum__galerias_v_version_visibilidade";
  DROP TYPE "public"."enum__galerias_v_version_status";
  DROP TYPE "public"."enum_documentos_visibilidade";
  DROP TYPE "public"."enum_documentos_status";
  DROP TYPE "public"."enum__documentos_v_version_visibilidade";
  DROP TYPE "public"."enum__documentos_v_version_status";
  DROP TYPE "public"."enum_eventos_inicio_tz";
  DROP TYPE "public"."enum_eventos_fim_tz";
  DROP TYPE "public"."enum_eventos_visibilidade";
  DROP TYPE "public"."enum_eventos_status";
  DROP TYPE "public"."enum__eventos_v_version_inicio_tz";
  DROP TYPE "public"."enum__eventos_v_version_fim_tz";
  DROP TYPE "public"."enum__eventos_v_version_visibilidade";
  DROP TYPE "public"."enum__eventos_v_version_status";
  DROP TYPE "public"."enum_paginas_blocks_imagem_largura";
  DROP TYPE "public"."enum_paginas_blocks_galeria_exibicao";
  DROP TYPE "public"."enum_paginas_blocks_botao_link_tipo";
  DROP TYPE "public"."enum_paginas_blocks_botao_link_rota";
  DROP TYPE "public"."enum_paginas_visibilidade";
  DROP TYPE "public"."enum_paginas_status";
  DROP TYPE "public"."enum__paginas_v_blocks_imagem_largura";
  DROP TYPE "public"."enum__paginas_v_blocks_galeria_exibicao";
  DROP TYPE "public"."enum__paginas_v_blocks_botao_link_tipo";
  DROP TYPE "public"."enum__paginas_v_blocks_botao_link_rota";
  DROP TYPE "public"."enum__paginas_v_version_visibilidade";
  DROP TYPE "public"."enum__paginas_v_version_status";
  DROP TYPE "public"."enum_perguntas_secao";
  DROP TYPE "public"."enum_perguntas_visibilidade";
  DROP TYPE "public"."enum_usuarios_papel";
  DROP TYPE "public"."enum_atividades_acao";
  DROP TYPE "public"."enum_payload_folders_folder_type";
  DROP TYPE "public"."enum_pagina_inicial_topo_botoes_link_tipo";
  DROP TYPE "public"."enum_pagina_inicial_topo_botoes_link_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_proxima_etapa_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_proxima_etapa_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_lideres_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_lideres_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_calendario_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_calendario_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_treinos_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_treinos_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_noticias_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_noticias_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_comunicados_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_comunicados_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_pilotos_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_pilotos_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_galeria_destaque_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_galeria_destaque_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_kartodromo_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_kartodromo_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_ingressos_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_ingressos_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_perguntas_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_perguntas_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_contato_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_contato_botao_rota";
  DROP TYPE "public"."enum_pagina_inicial_blocks_apoiadores_botao_tipo";
  DROP TYPE "public"."enum_pagina_inicial_blocks_apoiadores_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_version_topo_botoes_link_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_version_topo_botoes_link_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_proxima_etapa_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_proxima_etapa_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_lideres_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_lideres_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_calendario_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_calendario_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_treinos_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_treinos_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_noticias_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_noticias_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_comunicados_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_comunicados_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_pilotos_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_pilotos_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_galeria_destaque_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_galeria_destaque_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_kartodromo_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_kartodromo_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_ingressos_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_ingressos_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_perguntas_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_perguntas_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_contato_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_contato_botao_rota";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_apoiadores_botao_tipo";
  DROP TYPE "public"."enum__pagina_inicial_v_blocks_apoiadores_botao_rota";
  DROP TYPE "public"."enum_contato_canais_exibir_em";
  DROP TYPE "public"."enum_contato_canais_tipo";
  DROP TYPE "public"."enum_contato_redes_rede";
  DROP TYPE "public"."enum_contato_redes_referente";
  DROP TYPE "public"."enum__contato_v_version_canais_exibir_em";
  DROP TYPE "public"."enum__contato_v_version_canais_tipo";
  DROP TYPE "public"."enum__contato_v_version_redes_rede";
  DROP TYPE "public"."enum__contato_v_version_redes_referente";
  DROP TYPE "public"."enum_textos_paginas_paginas_rota";
  DROP TYPE "public"."enum__textos_paginas_v_version_paginas_rota";
  DROP TYPE "public"."enum_navegacao_menu_subitens_link_tipo";
  DROP TYPE "public"."enum_navegacao_menu_subitens_link_rota";
  DROP TYPE "public"."enum_navegacao_menu_link_tipo";
  DROP TYPE "public"."enum_navegacao_menu_link_rota";
  DROP TYPE "public"."enum_navegacao_rodape_links_link_tipo";
  DROP TYPE "public"."enum_navegacao_rodape_links_link_rota";
  DROP TYPE "public"."enum_navegacao_botao_destaque_tipo";
  DROP TYPE "public"."enum_navegacao_botao_destaque_rota";
  DROP TYPE "public"."enum__navegacao_v_version_menu_subitens_link_tipo";
  DROP TYPE "public"."enum__navegacao_v_version_menu_subitens_link_rota";
  DROP TYPE "public"."enum__navegacao_v_version_menu_link_tipo";
  DROP TYPE "public"."enum__navegacao_v_version_menu_link_rota";
  DROP TYPE "public"."enum__navegacao_v_version_rodape_links_link_tipo";
  DROP TYPE "public"."enum__navegacao_v_version_rodape_links_link_rota";
  DROP TYPE "public"."enum__navegacao_v_version_botao_destaque_tipo";
  DROP TYPE "public"."enum__navegacao_v_version_botao_destaque_rota";`)
}
