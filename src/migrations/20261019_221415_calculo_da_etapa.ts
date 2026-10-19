import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_regras_pontuacao_calculo_da_etapa" AS ENUM('media-das-corridas', 'por-corrida');
  CREATE TYPE "public"."enum__regras_pontuacao_v_version_calculo_da_etapa" AS ENUM('media-das-corridas', 'por-corrida');
  ALTER TABLE "regras_pontuacao" ADD COLUMN "calculo_da_etapa" "enum_regras_pontuacao_calculo_da_etapa" DEFAULT 'media-das-corridas';
  ALTER TABLE "_regras_pontuacao_v" ADD COLUMN "version_calculo_da_etapa" "enum__regras_pontuacao_v_version_calculo_da_etapa" DEFAULT 'media-das-corridas';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "regras_pontuacao" DROP COLUMN "calculo_da_etapa";
  ALTER TABLE "_regras_pontuacao_v" DROP COLUMN "version_calculo_da_etapa";
  DROP TYPE "public"."enum_regras_pontuacao_calculo_da_etapa";
  DROP TYPE "public"."enum__regras_pontuacao_v_version_calculo_da_etapa";`)
}
