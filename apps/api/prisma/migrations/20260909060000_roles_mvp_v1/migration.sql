UPDATE "Usuario"
SET "rol" = 'operador_campo'
WHERE "rol" = 'usuario';

ALTER TABLE "Usuario"
ALTER COLUMN "rol" SET DEFAULT 'operador_campo';
