import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "kartodromo_mensalidade_planos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"ambulancias_incluidas" numeric,
  	"sem_desconto_pista" numeric,
  	"sem_desconto_ambulancias" numeric,
  	"com_desconto_pista" numeric,
  	"com_desconto_ambulancias" numeric
  );
  
  CREATE TABLE "kartodromo_mensalidade_regras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"texto" varchar
  );
  
  CREATE TABLE "_kartodromo_v_version_mensalidade_planos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"ambulancias_incluidas" numeric,
  	"sem_desconto_pista" numeric,
  	"sem_desconto_ambulancias" numeric,
  	"com_desconto_pista" numeric,
  	"com_desconto_ambulancias" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_kartodromo_v_version_mensalidade_regras" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"texto" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "kartodromo" ADD COLUMN "mensalidade_introducao" varchar DEFAULT 'A taxa de pista também pode ser paga por mês. A mensalidade é só para quem não corre no horário de iniciante e já inclui algumas taxas de ambulância.';
  ALTER TABLE "_kartodromo_v" ADD COLUMN "version_mensalidade_introducao" varchar DEFAULT 'A taxa de pista também pode ser paga por mês. A mensalidade é só para quem não corre no horário de iniciante e já inclui algumas taxas de ambulância.';
  ALTER TABLE "kartodromo_mensalidade_planos" ADD CONSTRAINT "kartodromo_mensalidade_planos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kartodromo_mensalidade_regras" ADD CONSTRAINT "kartodromo_mensalidade_regras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kartodromo"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_mensalidade_planos" ADD CONSTRAINT "_kartodromo_v_version_mensalidade_planos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_kartodromo_v_version_mensalidade_regras" ADD CONSTRAINT "_kartodromo_v_version_mensalidade_regras_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_kartodromo_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "kartodromo_mensalidade_planos_order_idx" ON "kartodromo_mensalidade_planos" USING btree ("_order");
  CREATE INDEX "kartodromo_mensalidade_planos_parent_id_idx" ON "kartodromo_mensalidade_planos" USING btree ("_parent_id");
  CREATE INDEX "kartodromo_mensalidade_regras_order_idx" ON "kartodromo_mensalidade_regras" USING btree ("_order");
  CREATE INDEX "kartodromo_mensalidade_regras_parent_id_idx" ON "kartodromo_mensalidade_regras" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_mensalidade_planos_order_idx" ON "_kartodromo_v_version_mensalidade_planos" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_mensalidade_planos_parent_id_idx" ON "_kartodromo_v_version_mensalidade_planos" USING btree ("_parent_id");
  CREATE INDEX "_kartodromo_v_version_mensalidade_regras_order_idx" ON "_kartodromo_v_version_mensalidade_regras" USING btree ("_order");
  CREATE INDEX "_kartodromo_v_version_mensalidade_regras_parent_id_idx" ON "_kartodromo_v_version_mensalidade_regras" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "kartodromo_mensalidade_planos" CASCADE;
  DROP TABLE "kartodromo_mensalidade_regras" CASCADE;
  DROP TABLE "_kartodromo_v_version_mensalidade_planos" CASCADE;
  DROP TABLE "_kartodromo_v_version_mensalidade_regras" CASCADE;
  ALTER TABLE "kartodromo" DROP COLUMN "mensalidade_introducao";
  ALTER TABLE "_kartodromo_v" DROP COLUMN "version_mensalidade_introducao";`)
}
