import type { ErpCampania } from '@agro/tipos';

type CabeceraPlanificacionEditorProps = {
  nombre: string;
  campaniaErpId: string;
  descripcion: string;
  campanias: ErpCampania[];
  puedeEditar: boolean;
  onNombreChange: (nombre: string) => void;
  onCampaniaChange: (campaniaErpId: string) => void;
  onDescripcionChange: (descripcion: string) => void;
};

export function CabeceraPlanificacionEditor({
  nombre,
  campaniaErpId,
  descripcion,
  campanias,
  puedeEditar,
  onNombreChange,
  onCampaniaChange,
  onDescripcionChange,
}: CabeceraPlanificacionEditorProps) {
  return (
    <div className="planning-editor-header">
      <label>
        Nombre
        <input value={nombre} onChange={(event) => onNombreChange(event.target.value)} disabled={!puedeEditar} />
      </label>
      <label>
        Campania
        <select value={campaniaErpId} onChange={(event) => onCampaniaChange(event.target.value)} disabled={!puedeEditar}>
          {campanias.map((campania) => (
            <option key={campania.erpId} value={campania.erpId}>
              {campania.codigo} {campania.esActual ? '(actual)' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="planning-editor-description">
        Descripcion
        <input value={descripcion} onChange={(event) => onDescripcionChange(event.target.value)} disabled={!puedeEditar} />
      </label>
    </div>
  );
}
