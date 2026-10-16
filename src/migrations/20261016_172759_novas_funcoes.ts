import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_etapas_grade_treinos_livres_inicio" AS ENUM('00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40', '00:45', '00:50', '00:55', '01:00', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30', '01:35', '01:40', '01:45', '01:50', '01:55', '02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:30', '02:35', '02:40', '02:45', '02:50', '02:55', '03:00', '03:05', '03:10', '03:15', '03:20', '03:25', '03:30', '03:35', '03:40', '03:45', '03:50', '03:55', '04:00', '04:05', '04:10', '04:15', '04:20', '04:25', '04:30', '04:35', '04:40', '04:45', '04:50', '04:55', '05:00', '05:05', '05:10', '05:15', '05:20', '05:25', '05:30', '05:35', '05:40', '05:45', '05:50', '05:55', '06:00', '06:05', '06:10', '06:15', '06:20', '06:25', '06:30', '06:35', '06:40', '06:45', '06:50', '06:55', '07:00', '07:05', '07:10', '07:15', '07:20', '07:25', '07:30', '07:35', '07:40', '07:45', '07:50', '07:55', '08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:05', '09:10', '09:15', '09:20', '09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55', '11:00', '11:05', '11:10', '11:15', '11:20', '11:25', '11:30', '11:35', '11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55', '13:00', '13:05', '13:10', '13:15', '13:20', '13:25', '13:30', '13:35', '13:40', '13:45', '13:50', '13:55', '14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30', '14:35', '14:40', '14:45', '14:50', '14:55', '15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40', '15:45', '15:50', '15:55', '16:00', '16:05', '16:10', '16:15', '16:20', '16:25', '16:30', '16:35', '16:40', '16:45', '16:50', '16:55', '17:00', '17:05', '17:10', '17:15', '17:20', '17:25', '17:30', '17:35', '17:40', '17:45', '17:50', '17:55', '18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:10', '19:15', '19:20', '19:25', '19:30', '19:35', '19:40', '19:45', '19:50', '19:55', '20:00', '20:05', '20:10', '20:15', '20:20', '20:25', '20:30', '20:35', '20:40', '20:45', '20:50', '20:55', '21:00', '21:05', '21:10', '21:15', '21:20', '21:25', '21:30', '21:35', '21:40', '21:45', '21:50', '21:55', '22:00', '22:05', '22:10', '22:15', '22:20', '22:25', '22:30', '22:35', '22:40', '22:45', '22:50', '22:55', '23:00', '23:05', '23:10', '23:15', '23:20', '23:25', '23:30', '23:35', '23:40', '23:45', '23:50', '23:55');
  CREATE TYPE "public"."enum_etapas_grade_treinos_livres_fim" AS ENUM('00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40', '00:45', '00:50', '00:55', '01:00', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30', '01:35', '01:40', '01:45', '01:50', '01:55', '02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:30', '02:35', '02:40', '02:45', '02:50', '02:55', '03:00', '03:05', '03:10', '03:15', '03:20', '03:25', '03:30', '03:35', '03:40', '03:45', '03:50', '03:55', '04:00', '04:05', '04:10', '04:15', '04:20', '04:25', '04:30', '04:35', '04:40', '04:45', '04:50', '04:55', '05:00', '05:05', '05:10', '05:15', '05:20', '05:25', '05:30', '05:35', '05:40', '05:45', '05:50', '05:55', '06:00', '06:05', '06:10', '06:15', '06:20', '06:25', '06:30', '06:35', '06:40', '06:45', '06:50', '06:55', '07:00', '07:05', '07:10', '07:15', '07:20', '07:25', '07:30', '07:35', '07:40', '07:45', '07:50', '07:55', '08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:05', '09:10', '09:15', '09:20', '09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55', '11:00', '11:05', '11:10', '11:15', '11:20', '11:25', '11:30', '11:35', '11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55', '13:00', '13:05', '13:10', '13:15', '13:20', '13:25', '13:30', '13:35', '13:40', '13:45', '13:50', '13:55', '14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30', '14:35', '14:40', '14:45', '14:50', '14:55', '15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40', '15:45', '15:50', '15:55', '16:00', '16:05', '16:10', '16:15', '16:20', '16:25', '16:30', '16:35', '16:40', '16:45', '16:50', '16:55', '17:00', '17:05', '17:10', '17:15', '17:20', '17:25', '17:30', '17:35', '17:40', '17:45', '17:50', '17:55', '18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:10', '19:15', '19:20', '19:25', '19:30', '19:35', '19:40', '19:45', '19:50', '19:55', '20:00', '20:05', '20:10', '20:15', '20:20', '20:25', '20:30', '20:35', '20:40', '20:45', '20:50', '20:55', '21:00', '21:05', '21:10', '21:15', '21:20', '21:25', '21:30', '21:35', '21:40', '21:45', '21:50', '21:55', '22:00', '22:05', '22:10', '22:15', '22:20', '22:25', '22:30', '22:35', '22:40', '22:45', '22:50', '22:55', '23:00', '23:05', '23:10', '23:15', '23:20', '23:25', '23:30', '23:35', '23:40', '23:45', '23:50', '23:55');
  CREATE TYPE "public"."enum_etapas_publicacao" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__etapas_v_version_grade_treinos_livres_inicio" AS ENUM('00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40', '00:45', '00:50', '00:55', '01:00', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30', '01:35', '01:40', '01:45', '01:50', '01:55', '02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:30', '02:35', '02:40', '02:45', '02:50', '02:55', '03:00', '03:05', '03:10', '03:15', '03:20', '03:25', '03:30', '03:35', '03:40', '03:45', '03:50', '03:55', '04:00', '04:05', '04:10', '04:15', '04:20', '04:25', '04:30', '04:35', '04:40', '04:45', '04:50', '04:55', '05:00', '05:05', '05:10', '05:15', '05:20', '05:25', '05:30', '05:35', '05:40', '05:45', '05:50', '05:55', '06:00', '06:05', '06:10', '06:15', '06:20', '06:25', '06:30', '06:35', '06:40', '06:45', '06:50', '06:55', '07:00', '07:05', '07:10', '07:15', '07:20', '07:25', '07:30', '07:35', '07:40', '07:45', '07:50', '07:55', '08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:05', '09:10', '09:15', '09:20', '09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55', '11:00', '11:05', '11:10', '11:15', '11:20', '11:25', '11:30', '11:35', '11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55', '13:00', '13:05', '13:10', '13:15', '13:20', '13:25', '13:30', '13:35', '13:40', '13:45', '13:50', '13:55', '14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30', '14:35', '14:40', '14:45', '14:50', '14:55', '15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40', '15:45', '15:50', '15:55', '16:00', '16:05', '16:10', '16:15', '16:20', '16:25', '16:30', '16:35', '16:40', '16:45', '16:50', '16:55', '17:00', '17:05', '17:10', '17:15', '17:20', '17:25', '17:30', '17:35', '17:40', '17:45', '17:50', '17:55', '18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:10', '19:15', '19:20', '19:25', '19:30', '19:35', '19:40', '19:45', '19:50', '19:55', '20:00', '20:05', '20:10', '20:15', '20:20', '20:25', '20:30', '20:35', '20:40', '20:45', '20:50', '20:55', '21:00', '21:05', '21:10', '21:15', '21:20', '21:25', '21:30', '21:35', '21:40', '21:45', '21:50', '21:55', '22:00', '22:05', '22:10', '22:15', '22:20', '22:25', '22:30', '22:35', '22:40', '22:45', '22:50', '22:55', '23:00', '23:05', '23:10', '23:15', '23:20', '23:25', '23:30', '23:35', '23:40', '23:45', '23:50', '23:55');
  CREATE TYPE "public"."enum__etapas_v_version_grade_treinos_livres_fim" AS ENUM('00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40', '00:45', '00:50', '00:55', '01:00', '01:05', '01:10', '01:15', '01:20', '01:25', '01:30', '01:35', '01:40', '01:45', '01:50', '01:55', '02:00', '02:05', '02:10', '02:15', '02:20', '02:25', '02:30', '02:35', '02:40', '02:45', '02:50', '02:55', '03:00', '03:05', '03:10', '03:15', '03:20', '03:25', '03:30', '03:35', '03:40', '03:45', '03:50', '03:55', '04:00', '04:05', '04:10', '04:15', '04:20', '04:25', '04:30', '04:35', '04:40', '04:45', '04:50', '04:55', '05:00', '05:05', '05:10', '05:15', '05:20', '05:25', '05:30', '05:35', '05:40', '05:45', '05:50', '05:55', '06:00', '06:05', '06:10', '06:15', '06:20', '06:25', '06:30', '06:35', '06:40', '06:45', '06:50', '06:55', '07:00', '07:05', '07:10', '07:15', '07:20', '07:25', '07:30', '07:35', '07:40', '07:45', '07:50', '07:55', '08:00', '08:05', '08:10', '08:15', '08:20', '08:25', '08:30', '08:35', '08:40', '08:45', '08:50', '08:55', '09:00', '09:05', '09:10', '09:15', '09:20', '09:25', '09:30', '09:35', '09:40', '09:45', '09:50', '09:55', '10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30', '10:35', '10:40', '10:45', '10:50', '10:55', '11:00', '11:05', '11:10', '11:15', '11:20', '11:25', '11:30', '11:35', '11:40', '11:45', '11:50', '11:55', '12:00', '12:05', '12:10', '12:15', '12:20', '12:25', '12:30', '12:35', '12:40', '12:45', '12:50', '12:55', '13:00', '13:05', '13:10', '13:15', '13:20', '13:25', '13:30', '13:35', '13:40', '13:45', '13:50', '13:55', '14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30', '14:35', '14:40', '14:45', '14:50', '14:55', '15:00', '15:05', '15:10', '15:15', '15:20', '15:25', '15:30', '15:35', '15:40', '15:45', '15:50', '15:55', '16:00', '16:05', '16:10', '16:15', '16:20', '16:25', '16:30', '16:35', '16:40', '16:45', '16:50', '16:55', '17:00', '17:05', '17:10', '17:15', '17:20', '17:25', '17:30', '17:35', '17:40', '17:45', '17:50', '17:55', '18:00', '18:05', '18:10', '18:15', '18:20', '18:25', '18:30', '18:35', '18:40', '18:45', '18:50', '18:55', '19:00', '19:05', '19:10', '19:15', '19:20', '19:25', '19:30', '19:35', '19:40', '19:45', '19:50', '19:55', '20:00', '20:05', '20:10', '20:15', '20:20', '20:25', '20:30', '20:35', '20:40', '20:45', '20:50', '20:55', '21:00', '21:05', '21:10', '21:15', '21:20', '21:25', '21:30', '21:35', '21:40', '21:45', '21:50', '21:55', '22:00', '22:05', '22:10', '22:15', '22:20', '22:25', '22:30', '22:35', '22:40', '22:45', '22:50', '22:55', '23:00', '23:05', '23:10', '23:15', '23:20', '23:25', '23:30', '23:35', '23:40', '23:45', '23:50', '23:55');
  CREATE TYPE "public"."enum__etapas_v_version_inicio_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum__etapas_v_version_fim_tz" AS ENUM('America/Sao_Paulo');
  CREATE TYPE "public"."enum__etapas_v_version_status" AS ENUM('agendada', 'confirmada', 'adiada', 'cancelada', 'realizada');
  CREATE TYPE "public"."enum__etapas_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__etapas_v_version_publicacao" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_perguntas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__perguntas_v_version_secao" AS ENUM('kartodromo', 'bks', 'geral');
  CREATE TYPE "public"."enum__perguntas_v_version_visibilidade" AS ENUM('visivel', 'oculto', 'arquivado');
  CREATE TYPE "public"."enum__perguntas_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_pagina_inicial_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pagina_inicial_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_kartodromo_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__kartodromo_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_contato_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contato_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_institucional_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__institucional_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_textos_paginas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__textos_paginas_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_navegacao_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__navegacao_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "etapas_grade_treinos_livres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"dia" timestamp(3) with time zone,
  	"inicio" "enum_etapas_grade_treinos_livres_inicio",
  	"fim" "enum_etapas_grade_treinos_livres_fim",
  	"observacao" varchar
  );
  
  CREATE TABLE "_etapas_v_version_grade_treinos_livres" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"dia" timestamp(3) with time zone,
  	"inicio" "enum__etapas_v_version_grade_treinos_livres_inicio",
  	"fim" "enum__etapas_v_version_grade_treinos_livres_fim",
  	"observacao" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_etapas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_titulo" varchar,
  	"version_temporada_id" integer,
  	"version_numero" numeric,
  	"version_nome" varchar,
  	"version_inicio" timestamp(3) with time zone,
  	"version_inicio_tz" "enum__etapas_v_version_inicio_tz" DEFAULT 'America/Sao_Paulo',
  	"version_fim" timestamp(3) with time zone,
  	"version_fim_tz" "enum__etapas_v_version_fim_tz" DEFAULT 'America/Sao_Paulo',
  	"version_status" "enum__etapas_v_version_status" DEFAULT 'agendada',
  	"version_fator_pontuacao" numeric DEFAULT 1,
  	"version_local" varchar,
  	"version_local_mapa" varchar,
  	"version_link_ingressos" varchar,
  	"version_link_treinos_livres" varchar,
  	"version_imagem_grade_treinos_livres_id" integer,
  	"version_transmissao_profissional" varchar,
  	"version_transmissao_indoor" varchar,
  	"version_descricao" jsonb,
  	"version_imagem_id" integer,
  	"version_visibilidade" "enum__etapas_v_version_visibilidade" DEFAULT 'visivel',
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__etapas_v_version_publicacao" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_etapas_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categorias_id" integer
  );
  
  CREATE TABLE "categorias_subcategorias" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL
  );
  
  CREATE TABLE "_perguntas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_pergunta" varchar,
  	"version_resposta" jsonb,
  	"version_secao" "enum__perguntas_v_version_secao" DEFAULT 'kartodromo',
  	"version_visibilidade" "enum__perguntas_v_version_visibilidade" DEFAULT 'visivel',
  	"version_texto_busca" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version__status" "enum__perguntas_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "configuracoes_itens_evento_publico" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL
  );
  
  CREATE TABLE "_configuracoes_v_version_itens_evento_publico" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"texto" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  ALTER TABLE "etapas" ALTER COLUMN "temporada_id" DROP NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "numero" DROP NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "status" DROP NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "visibilidade" DROP NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "pergunta" DROP NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "resposta" DROP NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "secao" DROP NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "visibilidade" DROP NOT NULL;
  ALTER TABLE "pagina_inicial_topo_botoes" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ALTER COLUMN "nome" DROP NOT NULL;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ALTER COLUMN "logo_id" DROP NOT NULL;
  ALTER TABLE "_pagina_inicial_v_version_topo_botoes" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ALTER COLUMN "nome" DROP NOT NULL;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ALTER COLUMN "logo_id" DROP NOT NULL;
  ALTER TABLE "kartodromo_taxas" ALTER COLUMN "item" DROP NOT NULL;
  ALTER TABLE "kartodromo_como_treinar" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "kartodromo_estrutura" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "kartodromo_dados_pista" ALTER COLUMN "rotulo" DROP NOT NULL;
  ALTER TABLE "kartodromo_dados_pista" ALTER COLUMN "valor" DROP NOT NULL;
  ALTER TABLE "kartodromo" ALTER COLUMN "nome" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v_version_taxas" ALTER COLUMN "item" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v_version_como_treinar" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v_version_estrutura" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v_version_dados_pista" ALTER COLUMN "rotulo" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v_version_dados_pista" ALTER COLUMN "valor" DROP NOT NULL;
  ALTER TABLE "_kartodromo_v" ALTER COLUMN "version_nome" DROP NOT NULL;
  ALTER TABLE "contato_canais" ALTER COLUMN "tipo" DROP NOT NULL;
  ALTER TABLE "contato_canais" ALTER COLUMN "valor" DROP NOT NULL;
  ALTER TABLE "contato_horarios" ALTER COLUMN "dias" DROP NOT NULL;
  ALTER TABLE "contato_horarios" ALTER COLUMN "horario" DROP NOT NULL;
  ALTER TABLE "contato_redes" ALTER COLUMN "rede" DROP NOT NULL;
  ALTER TABLE "contato_redes" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_canais" ALTER COLUMN "tipo" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_canais" ALTER COLUMN "valor" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_horarios" ALTER COLUMN "dias" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_horarios" ALTER COLUMN "horario" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_redes" ALTER COLUMN "rede" DROP NOT NULL;
  ALTER TABLE "_contato_v_version_redes" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "institucional_pilares" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "institucional_pilares" ALTER COLUMN "texto" DROP NOT NULL;
  ALTER TABLE "institucional_marcos" ALTER COLUMN "ano" DROP NOT NULL;
  ALTER TABLE "institucional_marcos" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "institucional_diretoria" ALTER COLUMN "nome" DROP NOT NULL;
  ALTER TABLE "institucional_diretoria" ALTER COLUMN "cargo" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_pilares" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_pilares" ALTER COLUMN "texto" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_marcos" ALTER COLUMN "ano" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_marcos" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_diretoria" ALTER COLUMN "nome" DROP NOT NULL;
  ALTER TABLE "_institucional_v_version_diretoria" ALTER COLUMN "cargo" DROP NOT NULL;
  ALTER TABLE "textos_paginas_paginas" ALTER COLUMN "rota" DROP NOT NULL;
  ALTER TABLE "_textos_paginas_v_version_paginas" ALTER COLUMN "rota" DROP NOT NULL;
  ALTER TABLE "navegacao_menu_subitens" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "navegacao_menu" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "navegacao_rodape_links" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "navegacao_rodape" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "_navegacao_v_version_menu_subitens" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "_navegacao_v_version_menu" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "_navegacao_v_version_rodape_links" ALTER COLUMN "link_tipo" DROP NOT NULL;
  ALTER TABLE "_navegacao_v_version_rodape" ALTER COLUMN "titulo" DROP NOT NULL;
  ALTER TABLE "etapas" ADD COLUMN "link_treinos_livres" varchar;
  ALTER TABLE "etapas" ADD COLUMN "imagem_grade_treinos_livres_id" integer;
  ALTER TABLE "etapas" ADD COLUMN "transmissao_profissional" varchar;
  ALTER TABLE "etapas" ADD COLUMN "transmissao_indoor" varchar;
  ALTER TABLE "etapas" ADD COLUMN "_status" "enum_etapas_publicacao" DEFAULT 'draft';
  ALTER TABLE "perguntas" ADD COLUMN "_status" "enum_perguntas_status" DEFAULT 'draft';
  ALTER TABLE "pagina_inicial" ADD COLUMN "_status" "enum_pagina_inicial_status" DEFAULT 'draft';
  ALTER TABLE "_pagina_inicial_v" ADD COLUMN "version__status" "enum__pagina_inicial_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_pagina_inicial_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_pagina_inicial_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "kartodromo" ADD COLUMN "_status" "enum_kartodromo_status" DEFAULT 'draft';
  ALTER TABLE "_kartodromo_v" ADD COLUMN "version__status" "enum__kartodromo_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_kartodromo_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_kartodromo_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "contato" ADD COLUMN "_status" "enum_contato_status" DEFAULT 'draft';
  ALTER TABLE "_contato_v" ADD COLUMN "version__status" "enum__contato_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_contato_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_contato_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "institucional" ADD COLUMN "_status" "enum_institucional_status" DEFAULT 'draft';
  ALTER TABLE "_institucional_v" ADD COLUMN "version__status" "enum__institucional_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_institucional_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_institucional_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "textos_paginas" ADD COLUMN "_status" "enum_textos_paginas_status" DEFAULT 'draft';
  ALTER TABLE "_textos_paginas_v" ADD COLUMN "version__status" "enum__textos_paginas_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_textos_paginas_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_textos_paginas_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "navegacao" ADD COLUMN "_status" "enum_navegacao_status" DEFAULT 'draft';
  ALTER TABLE "_navegacao_v" ADD COLUMN "version__status" "enum__navegacao_v_version_status" DEFAULT 'draft';
  ALTER TABLE "_navegacao_v" ADD COLUMN "latest" boolean;
  ALTER TABLE "_navegacao_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "configuracoes" ADD COLUMN "exibir_evento_publico" boolean DEFAULT true;
  ALTER TABLE "configuracoes" ADD COLUMN "texto_evento_publico" varchar DEFAULT 'O evento é aberto ao público, com entrada gratuita.';
  ALTER TABLE "_configuracoes_v" ADD COLUMN "version_exibir_evento_publico" boolean DEFAULT true;
  ALTER TABLE "_configuracoes_v" ADD COLUMN "version_texto_evento_publico" varchar DEFAULT 'O evento é aberto ao público, com entrada gratuita.';
  ALTER TABLE "etapas_grade_treinos_livres" ADD CONSTRAINT "etapas_grade_treinos_livres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."etapas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_etapas_v_version_grade_treinos_livres" ADD CONSTRAINT "_etapas_v_version_grade_treinos_livres_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_etapas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_etapas_v" ADD CONSTRAINT "_etapas_v_parent_id_etapas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."etapas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_etapas_v" ADD CONSTRAINT "_etapas_v_version_temporada_id_temporadas_id_fk" FOREIGN KEY ("version_temporada_id") REFERENCES "public"."temporadas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_etapas_v" ADD CONSTRAINT "_etapas_v_version_imagem_grade_treinos_livres_id_midia_id_fk" FOREIGN KEY ("version_imagem_grade_treinos_livres_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_etapas_v" ADD CONSTRAINT "_etapas_v_version_imagem_id_midia_id_fk" FOREIGN KEY ("version_imagem_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_etapas_v_rels" ADD CONSTRAINT "_etapas_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_etapas_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_etapas_v_rels" ADD CONSTRAINT "_etapas_v_rels_categorias_fk" FOREIGN KEY ("categorias_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categorias_subcategorias" ADD CONSTRAINT "categorias_subcategorias_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categorias"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_perguntas_v" ADD CONSTRAINT "_perguntas_v_parent_id_perguntas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."perguntas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "configuracoes_itens_evento_publico" ADD CONSTRAINT "configuracoes_itens_evento_publico_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."configuracoes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_configuracoes_v_version_itens_evento_publico" ADD CONSTRAINT "_configuracoes_v_version_itens_evento_publico_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_configuracoes_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "etapas_grade_treinos_livres_order_idx" ON "etapas_grade_treinos_livres" USING btree ("_order");
  CREATE INDEX "etapas_grade_treinos_livres_parent_id_idx" ON "etapas_grade_treinos_livres" USING btree ("_parent_id");
  CREATE INDEX "_etapas_v_version_grade_treinos_livres_order_idx" ON "_etapas_v_version_grade_treinos_livres" USING btree ("_order");
  CREATE INDEX "_etapas_v_version_grade_treinos_livres_parent_id_idx" ON "_etapas_v_version_grade_treinos_livres" USING btree ("_parent_id");
  CREATE INDEX "_etapas_v_parent_idx" ON "_etapas_v" USING btree ("parent_id");
  CREATE INDEX "_etapas_v_version_version_titulo_idx" ON "_etapas_v" USING btree ("version_titulo");
  CREATE INDEX "_etapas_v_version_version_temporada_idx" ON "_etapas_v" USING btree ("version_temporada_id");
  CREATE INDEX "_etapas_v_version_version_numero_idx" ON "_etapas_v" USING btree ("version_numero");
  CREATE INDEX "_etapas_v_version_version_inicio_idx" ON "_etapas_v" USING btree ("version_inicio");
  CREATE INDEX "_etapas_v_version_version_status_idx" ON "_etapas_v" USING btree ("version_status");
  CREATE INDEX "_etapas_v_version_version_imagem_grade_treinos_livres_idx" ON "_etapas_v" USING btree ("version_imagem_grade_treinos_livres_id");
  CREATE INDEX "_etapas_v_version_version_imagem_idx" ON "_etapas_v" USING btree ("version_imagem_id");
  CREATE INDEX "_etapas_v_version_version_visibilidade_idx" ON "_etapas_v" USING btree ("version_visibilidade");
  CREATE INDEX "_etapas_v_version_version_texto_busca_idx" ON "_etapas_v" USING btree ("version_texto_busca");
  CREATE INDEX "_etapas_v_version_version_updated_at_idx" ON "_etapas_v" USING btree ("version_updated_at");
  CREATE INDEX "_etapas_v_version_version_created_at_idx" ON "_etapas_v" USING btree ("version_created_at");
  CREATE INDEX "_etapas_v_version_version__status_idx" ON "_etapas_v" USING btree ("version__status");
  CREATE INDEX "_etapas_v_created_at_idx" ON "_etapas_v" USING btree ("created_at");
  CREATE INDEX "_etapas_v_updated_at_idx" ON "_etapas_v" USING btree ("updated_at");
  CREATE INDEX "_etapas_v_latest_idx" ON "_etapas_v" USING btree ("latest");
  CREATE INDEX "_etapas_v_autosave_idx" ON "_etapas_v" USING btree ("autosave");
  CREATE INDEX "version_temporada_version_numero_idx" ON "_etapas_v" USING btree ("version_temporada_id","version_numero");
  CREATE INDEX "_etapas_v_rels_order_idx" ON "_etapas_v_rels" USING btree ("order");
  CREATE INDEX "_etapas_v_rels_parent_idx" ON "_etapas_v_rels" USING btree ("parent_id");
  CREATE INDEX "_etapas_v_rels_path_idx" ON "_etapas_v_rels" USING btree ("path");
  CREATE INDEX "_etapas_v_rels_categorias_id_idx" ON "_etapas_v_rels" USING btree ("categorias_id");
  CREATE INDEX "categorias_subcategorias_order_idx" ON "categorias_subcategorias" USING btree ("_order");
  CREATE INDEX "categorias_subcategorias_parent_id_idx" ON "categorias_subcategorias" USING btree ("_parent_id");
  CREATE INDEX "_perguntas_v_parent_idx" ON "_perguntas_v" USING btree ("parent_id");
  CREATE INDEX "_perguntas_v_version_version__order_idx" ON "_perguntas_v" USING btree ("version__order");
  CREATE INDEX "_perguntas_v_version_version_visibilidade_idx" ON "_perguntas_v" USING btree ("version_visibilidade");
  CREATE INDEX "_perguntas_v_version_version_texto_busca_idx" ON "_perguntas_v" USING btree ("version_texto_busca");
  CREATE INDEX "_perguntas_v_version_version_updated_at_idx" ON "_perguntas_v" USING btree ("version_updated_at");
  CREATE INDEX "_perguntas_v_version_version_created_at_idx" ON "_perguntas_v" USING btree ("version_created_at");
  CREATE INDEX "_perguntas_v_version_version_deleted_at_idx" ON "_perguntas_v" USING btree ("version_deleted_at");
  CREATE INDEX "_perguntas_v_version_version__status_idx" ON "_perguntas_v" USING btree ("version__status");
  CREATE INDEX "_perguntas_v_created_at_idx" ON "_perguntas_v" USING btree ("created_at");
  CREATE INDEX "_perguntas_v_updated_at_idx" ON "_perguntas_v" USING btree ("updated_at");
  CREATE INDEX "_perguntas_v_latest_idx" ON "_perguntas_v" USING btree ("latest");
  CREATE INDEX "_perguntas_v_autosave_idx" ON "_perguntas_v" USING btree ("autosave");
  CREATE INDEX "configuracoes_itens_evento_publico_order_idx" ON "configuracoes_itens_evento_publico" USING btree ("_order");
  CREATE INDEX "configuracoes_itens_evento_publico_parent_id_idx" ON "configuracoes_itens_evento_publico" USING btree ("_parent_id");
  CREATE INDEX "_configuracoes_v_version_itens_evento_publico_order_idx" ON "_configuracoes_v_version_itens_evento_publico" USING btree ("_order");
  CREATE INDEX "_configuracoes_v_version_itens_evento_publico_parent_id_idx" ON "_configuracoes_v_version_itens_evento_publico" USING btree ("_parent_id");
  ALTER TABLE "etapas" ADD CONSTRAINT "etapas_imagem_grade_treinos_livres_id_midia_id_fk" FOREIGN KEY ("imagem_grade_treinos_livres_id") REFERENCES "public"."midia"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "etapas_imagem_grade_treinos_livres_idx" ON "etapas" USING btree ("imagem_grade_treinos_livres_id");
  CREATE INDEX "etapas__status_idx" ON "etapas" USING btree ("_status");
  CREATE INDEX "perguntas__status_idx" ON "perguntas" USING btree ("_status");
  CREATE INDEX "pagina_inicial__status_idx" ON "pagina_inicial" USING btree ("_status");
  CREATE INDEX "_pagina_inicial_v_version_version__status_idx" ON "_pagina_inicial_v" USING btree ("version__status");
  CREATE INDEX "_pagina_inicial_v_latest_idx" ON "_pagina_inicial_v" USING btree ("latest");
  CREATE INDEX "_pagina_inicial_v_autosave_idx" ON "_pagina_inicial_v" USING btree ("autosave");
  CREATE INDEX "kartodromo__status_idx" ON "kartodromo" USING btree ("_status");
  CREATE INDEX "_kartodromo_v_version_version__status_idx" ON "_kartodromo_v" USING btree ("version__status");
  CREATE INDEX "_kartodromo_v_latest_idx" ON "_kartodromo_v" USING btree ("latest");
  CREATE INDEX "_kartodromo_v_autosave_idx" ON "_kartodromo_v" USING btree ("autosave");
  CREATE INDEX "contato__status_idx" ON "contato" USING btree ("_status");
  CREATE INDEX "_contato_v_version_version__status_idx" ON "_contato_v" USING btree ("version__status");
  CREATE INDEX "_contato_v_latest_idx" ON "_contato_v" USING btree ("latest");
  CREATE INDEX "_contato_v_autosave_idx" ON "_contato_v" USING btree ("autosave");
  CREATE INDEX "institucional__status_idx" ON "institucional" USING btree ("_status");
  CREATE INDEX "_institucional_v_version_version__status_idx" ON "_institucional_v" USING btree ("version__status");
  CREATE INDEX "_institucional_v_latest_idx" ON "_institucional_v" USING btree ("latest");
  CREATE INDEX "_institucional_v_autosave_idx" ON "_institucional_v" USING btree ("autosave");
  CREATE INDEX "textos_paginas__status_idx" ON "textos_paginas" USING btree ("_status");
  CREATE INDEX "_textos_paginas_v_version_version__status_idx" ON "_textos_paginas_v" USING btree ("version__status");
  CREATE INDEX "_textos_paginas_v_latest_idx" ON "_textos_paginas_v" USING btree ("latest");
  CREATE INDEX "_textos_paginas_v_autosave_idx" ON "_textos_paginas_v" USING btree ("autosave");
  CREATE INDEX "navegacao__status_idx" ON "navegacao" USING btree ("_status");
  CREATE INDEX "_navegacao_v_version_version__status_idx" ON "_navegacao_v" USING btree ("version__status");
  CREATE INDEX "_navegacao_v_latest_idx" ON "_navegacao_v" USING btree ("latest");
  CREATE INDEX "_navegacao_v_autosave_idx" ON "_navegacao_v" USING btree ("autosave");
  -- Com rascunho ligado, o que já existia continua publicado (sem isto, sumiria do site)
  UPDATE "etapas" SET "_status" = 'published';
  UPDATE "perguntas" SET "_status" = 'published';
  UPDATE "pagina_inicial" SET "_status" = 'published';
  UPDATE "_pagina_inicial_v" SET "version__status" = 'published';
  UPDATE "kartodromo" SET "_status" = 'published';
  UPDATE "_kartodromo_v" SET "version__status" = 'published';
  UPDATE "contato" SET "_status" = 'published';
  UPDATE "_contato_v" SET "version__status" = 'published';
  UPDATE "institucional" SET "_status" = 'published';
  UPDATE "_institucional_v" SET "version__status" = 'published';
  UPDATE "textos_paginas" SET "_status" = 'published';
  UPDATE "_textos_paginas_v" SET "version__status" = 'published';
  UPDATE "navegacao" SET "_status" = 'published';
  UPDATE "_navegacao_v" SET "version__status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "etapas_grade_treinos_livres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_etapas_v_version_grade_treinos_livres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_etapas_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_etapas_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "categorias_subcategorias" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_perguntas_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "configuracoes_itens_evento_publico" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_configuracoes_v_version_itens_evento_publico" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "etapas_grade_treinos_livres" CASCADE;
  DROP TABLE "_etapas_v_version_grade_treinos_livres" CASCADE;
  DROP TABLE "_etapas_v" CASCADE;
  DROP TABLE "_etapas_v_rels" CASCADE;
  DROP TABLE "categorias_subcategorias" CASCADE;
  DROP TABLE "_perguntas_v" CASCADE;
  DROP TABLE "configuracoes_itens_evento_publico" CASCADE;
  DROP TABLE "_configuracoes_v_version_itens_evento_publico" CASCADE;
  ALTER TABLE "etapas" DROP CONSTRAINT "etapas_imagem_grade_treinos_livres_id_midia_id_fk";
  
  DROP INDEX "etapas_imagem_grade_treinos_livres_idx";
  DROP INDEX "etapas__status_idx";
  DROP INDEX "perguntas__status_idx";
  DROP INDEX "pagina_inicial__status_idx";
  DROP INDEX "_pagina_inicial_v_version_version__status_idx";
  DROP INDEX "_pagina_inicial_v_latest_idx";
  DROP INDEX "_pagina_inicial_v_autosave_idx";
  DROP INDEX "kartodromo__status_idx";
  DROP INDEX "_kartodromo_v_version_version__status_idx";
  DROP INDEX "_kartodromo_v_latest_idx";
  DROP INDEX "_kartodromo_v_autosave_idx";
  DROP INDEX "contato__status_idx";
  DROP INDEX "_contato_v_version_version__status_idx";
  DROP INDEX "_contato_v_latest_idx";
  DROP INDEX "_contato_v_autosave_idx";
  DROP INDEX "institucional__status_idx";
  DROP INDEX "_institucional_v_version_version__status_idx";
  DROP INDEX "_institucional_v_latest_idx";
  DROP INDEX "_institucional_v_autosave_idx";
  DROP INDEX "textos_paginas__status_idx";
  DROP INDEX "_textos_paginas_v_version_version__status_idx";
  DROP INDEX "_textos_paginas_v_latest_idx";
  DROP INDEX "_textos_paginas_v_autosave_idx";
  DROP INDEX "navegacao__status_idx";
  DROP INDEX "_navegacao_v_version_version__status_idx";
  DROP INDEX "_navegacao_v_latest_idx";
  DROP INDEX "_navegacao_v_autosave_idx";
  ALTER TABLE "etapas" ALTER COLUMN "temporada_id" SET NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "numero" SET NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "status" SET NOT NULL;
  ALTER TABLE "etapas" ALTER COLUMN "visibilidade" SET NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "pergunta" SET NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "resposta" SET NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "secao" SET NOT NULL;
  ALTER TABLE "perguntas" ALTER COLUMN "visibilidade" SET NOT NULL;
  ALTER TABLE "pagina_inicial_topo_botoes" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ALTER COLUMN "nome" SET NOT NULL;
  ALTER TABLE "pagina_inicial_blocks_apoiadores_apoiadores" ALTER COLUMN "logo_id" SET NOT NULL;
  ALTER TABLE "_pagina_inicial_v_version_topo_botoes" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ALTER COLUMN "nome" SET NOT NULL;
  ALTER TABLE "_pagina_inicial_v_blocks_apoiadores_apoiadores" ALTER COLUMN "logo_id" SET NOT NULL;
  ALTER TABLE "kartodromo_taxas" ALTER COLUMN "item" SET NOT NULL;
  ALTER TABLE "kartodromo_como_treinar" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "kartodromo_estrutura" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "kartodromo_dados_pista" ALTER COLUMN "rotulo" SET NOT NULL;
  ALTER TABLE "kartodromo_dados_pista" ALTER COLUMN "valor" SET NOT NULL;
  ALTER TABLE "kartodromo" ALTER COLUMN "nome" SET NOT NULL;
  ALTER TABLE "_kartodromo_v_version_taxas" ALTER COLUMN "item" SET NOT NULL;
  ALTER TABLE "_kartodromo_v_version_como_treinar" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "_kartodromo_v_version_estrutura" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "_kartodromo_v_version_dados_pista" ALTER COLUMN "rotulo" SET NOT NULL;
  ALTER TABLE "_kartodromo_v_version_dados_pista" ALTER COLUMN "valor" SET NOT NULL;
  ALTER TABLE "_kartodromo_v" ALTER COLUMN "version_nome" SET NOT NULL;
  ALTER TABLE "contato_canais" ALTER COLUMN "tipo" SET NOT NULL;
  ALTER TABLE "contato_canais" ALTER COLUMN "valor" SET NOT NULL;
  ALTER TABLE "contato_horarios" ALTER COLUMN "dias" SET NOT NULL;
  ALTER TABLE "contato_horarios" ALTER COLUMN "horario" SET NOT NULL;
  ALTER TABLE "contato_redes" ALTER COLUMN "rede" SET NOT NULL;
  ALTER TABLE "contato_redes" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "_contato_v_version_canais" ALTER COLUMN "tipo" SET NOT NULL;
  ALTER TABLE "_contato_v_version_canais" ALTER COLUMN "valor" SET NOT NULL;
  ALTER TABLE "_contato_v_version_horarios" ALTER COLUMN "dias" SET NOT NULL;
  ALTER TABLE "_contato_v_version_horarios" ALTER COLUMN "horario" SET NOT NULL;
  ALTER TABLE "_contato_v_version_redes" ALTER COLUMN "rede" SET NOT NULL;
  ALTER TABLE "_contato_v_version_redes" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "institucional_pilares" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "institucional_pilares" ALTER COLUMN "texto" SET NOT NULL;
  ALTER TABLE "institucional_marcos" ALTER COLUMN "ano" SET NOT NULL;
  ALTER TABLE "institucional_marcos" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "institucional_diretoria" ALTER COLUMN "nome" SET NOT NULL;
  ALTER TABLE "institucional_diretoria" ALTER COLUMN "cargo" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_pilares" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_pilares" ALTER COLUMN "texto" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_marcos" ALTER COLUMN "ano" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_marcos" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_diretoria" ALTER COLUMN "nome" SET NOT NULL;
  ALTER TABLE "_institucional_v_version_diretoria" ALTER COLUMN "cargo" SET NOT NULL;
  ALTER TABLE "textos_paginas_paginas" ALTER COLUMN "rota" SET NOT NULL;
  ALTER TABLE "_textos_paginas_v_version_paginas" ALTER COLUMN "rota" SET NOT NULL;
  ALTER TABLE "navegacao_menu_subitens" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "navegacao_menu" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "navegacao_rodape_links" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "navegacao_rodape" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "_navegacao_v_version_menu_subitens" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "_navegacao_v_version_menu" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "_navegacao_v_version_rodape_links" ALTER COLUMN "link_tipo" SET NOT NULL;
  ALTER TABLE "_navegacao_v_version_rodape" ALTER COLUMN "titulo" SET NOT NULL;
  ALTER TABLE "etapas" DROP COLUMN "link_treinos_livres";
  ALTER TABLE "etapas" DROP COLUMN "imagem_grade_treinos_livres_id";
  ALTER TABLE "etapas" DROP COLUMN "transmissao_profissional";
  ALTER TABLE "etapas" DROP COLUMN "transmissao_indoor";
  ALTER TABLE "etapas" DROP COLUMN "_status";
  ALTER TABLE "perguntas" DROP COLUMN "_status";
  ALTER TABLE "pagina_inicial" DROP COLUMN "_status";
  ALTER TABLE "_pagina_inicial_v" DROP COLUMN "version__status";
  ALTER TABLE "_pagina_inicial_v" DROP COLUMN "latest";
  ALTER TABLE "_pagina_inicial_v" DROP COLUMN "autosave";
  ALTER TABLE "kartodromo" DROP COLUMN "_status";
  ALTER TABLE "_kartodromo_v" DROP COLUMN "version__status";
  ALTER TABLE "_kartodromo_v" DROP COLUMN "latest";
  ALTER TABLE "_kartodromo_v" DROP COLUMN "autosave";
  ALTER TABLE "contato" DROP COLUMN "_status";
  ALTER TABLE "_contato_v" DROP COLUMN "version__status";
  ALTER TABLE "_contato_v" DROP COLUMN "latest";
  ALTER TABLE "_contato_v" DROP COLUMN "autosave";
  ALTER TABLE "institucional" DROP COLUMN "_status";
  ALTER TABLE "_institucional_v" DROP COLUMN "version__status";
  ALTER TABLE "_institucional_v" DROP COLUMN "latest";
  ALTER TABLE "_institucional_v" DROP COLUMN "autosave";
  ALTER TABLE "textos_paginas" DROP COLUMN "_status";
  ALTER TABLE "_textos_paginas_v" DROP COLUMN "version__status";
  ALTER TABLE "_textos_paginas_v" DROP COLUMN "latest";
  ALTER TABLE "_textos_paginas_v" DROP COLUMN "autosave";
  ALTER TABLE "navegacao" DROP COLUMN "_status";
  ALTER TABLE "_navegacao_v" DROP COLUMN "version__status";
  ALTER TABLE "_navegacao_v" DROP COLUMN "latest";
  ALTER TABLE "_navegacao_v" DROP COLUMN "autosave";
  ALTER TABLE "configuracoes" DROP COLUMN "exibir_evento_publico";
  ALTER TABLE "configuracoes" DROP COLUMN "texto_evento_publico";
  ALTER TABLE "_configuracoes_v" DROP COLUMN "version_exibir_evento_publico";
  ALTER TABLE "_configuracoes_v" DROP COLUMN "version_texto_evento_publico";
  DROP TYPE "public"."enum_etapas_grade_treinos_livres_inicio";
  DROP TYPE "public"."enum_etapas_grade_treinos_livres_fim";
  DROP TYPE "public"."enum_etapas_publicacao";
  DROP TYPE "public"."enum__etapas_v_version_grade_treinos_livres_inicio";
  DROP TYPE "public"."enum__etapas_v_version_grade_treinos_livres_fim";
  DROP TYPE "public"."enum__etapas_v_version_inicio_tz";
  DROP TYPE "public"."enum__etapas_v_version_fim_tz";
  DROP TYPE "public"."enum__etapas_v_version_status";
  DROP TYPE "public"."enum__etapas_v_version_visibilidade";
  DROP TYPE "public"."enum__etapas_v_version_publicacao";
  DROP TYPE "public"."enum_perguntas_status";
  DROP TYPE "public"."enum__perguntas_v_version_secao";
  DROP TYPE "public"."enum__perguntas_v_version_visibilidade";
  DROP TYPE "public"."enum__perguntas_v_version_status";
  DROP TYPE "public"."enum_pagina_inicial_status";
  DROP TYPE "public"."enum__pagina_inicial_v_version_status";
  DROP TYPE "public"."enum_kartodromo_status";
  DROP TYPE "public"."enum__kartodromo_v_version_status";
  DROP TYPE "public"."enum_contato_status";
  DROP TYPE "public"."enum__contato_v_version_status";
  DROP TYPE "public"."enum_institucional_status";
  DROP TYPE "public"."enum__institucional_v_version_status";
  DROP TYPE "public"."enum_textos_paginas_status";
  DROP TYPE "public"."enum__textos_paginas_v_version_status";
  DROP TYPE "public"."enum_navegacao_status";
  DROP TYPE "public"."enum__navegacao_v_version_status";`)
}
