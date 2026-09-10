DO $$
BEGIN
  IF to_regclass('"ConceptoGastoComercial"') IS NOT NULL AND to_regclass('"ConceptoGastoComercialApp"') IS NULL THEN
    ALTER TABLE "ConceptoGastoComercial" RENAME TO "ConceptoGastoComercialApp";
  END IF;

  IF to_regclass('"GastosComercialesReferencia"') IS NOT NULL AND to_regclass('"GastoComercialApp"') IS NULL THEN
    ALTER TABLE "GastosComercialesReferencia" RENAME TO "GastoComercialApp";
  END IF;
END $$;

ALTER TABLE "ConceptoGastoComercialApp"
  ADD COLUMN IF NOT EXISTS "unidadCalculo" TEXT NOT NULL DEFAULT 'Tn';
