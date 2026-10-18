import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categorias_modalidade" AS ENUM('profissional', 'indoor');
  ALTER TYPE "public"."enum_corridas_tipo" ADD VALUE 'warm-up' BEFORE 'tomada-de-tempo';
  ALTER TYPE "public"."enum_temporadas_formato_etapa_tipo" ADD VALUE 'warm-up' BEFORE 'tomada-de-tempo';
  ALTER TABLE "configuracoes" ALTER COLUMN "texto_evento_publico" SET DEFAULT 'O evento é aberto ao público e a entrada é de graça.';
  ALTER TABLE "_configuracoes_v" ALTER COLUMN "version_texto_evento_publico" SET DEFAULT 'O evento é aberto ao público e a entrada é de graça.';
  ALTER TABLE "categorias" ADD COLUMN "modalidade" "enum_categorias_modalidade" DEFAULT 'profissional' NOT NULL;
  ALTER TABLE "configuracoes_itens_evento_publico" ADD COLUMN "descricao" varchar;
  ALTER TABLE "_configuracoes_v_version_itens_evento_publico" ADD COLUMN "descricao" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "corridas" ALTER COLUMN "tipo" SET DATA TYPE text;
  ALTER TABLE "corridas" ALTER COLUMN "tipo" SET DEFAULT 'bateria'::text;
  DROP TYPE "public"."enum_corridas_tipo";
  CREATE TYPE "public"."enum_corridas_tipo" AS ENUM('tomada-de-tempo', 'classificatoria', 'bateria', 'pre-final', 'final');
  ALTER TABLE "corridas" ALTER COLUMN "tipo" SET DEFAULT 'bateria'::"public"."enum_corridas_tipo";
  ALTER TABLE "corridas" ALTER COLUMN "tipo" SET DATA TYPE "public"."enum_corridas_tipo" USING "tipo"::"public"."enum_corridas_tipo";
  ALTER TABLE "temporadas_formato_etapa" ALTER COLUMN "tipo" SET DATA TYPE text;
  ALTER TABLE "temporadas_formato_etapa" ALTER COLUMN "tipo" SET DEFAULT 'bateria'::text;
  DROP TYPE "public"."enum_temporadas_formato_etapa_tipo";
  CREATE TYPE "public"."enum_temporadas_formato_etapa_tipo" AS ENUM('tomada-de-tempo', 'classificatoria', 'bateria', 'pre-final', 'final');
  ALTER TABLE "temporadas_formato_etapa" ALTER COLUMN "tipo" SET DEFAULT 'bateria'::"public"."enum_temporadas_formato_etapa_tipo";
  ALTER TABLE "temporadas_formato_etapa" ALTER COLUMN "tipo" SET DATA TYPE "public"."enum_temporadas_formato_etapa_tipo" USING "tipo"::"public"."enum_temporadas_formato_etapa_tipo";
  ALTER TABLE "configuracoes" ALTER COLUMN "texto_evento_publico" SET DEFAULT 'O evento é aberto ao público, com entrada gratuita.';
  ALTER TABLE "_configuracoes_v" ALTER COLUMN "version_texto_evento_publico" SET DEFAULT 'O evento é aberto ao público, com entrada gratuita.';
  ALTER TABLE "categorias" DROP COLUMN "modalidade";
  ALTER TABLE "configuracoes_itens_evento_publico" DROP COLUMN "descricao";
  ALTER TABLE "_configuracoes_v_version_itens_evento_publico" DROP COLUMN "descricao";
  DROP TYPE "public"."enum_categorias_modalidade";`)
}
