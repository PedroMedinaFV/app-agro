import type { MouseEvent, ReactNode } from 'react';
import type { PlanificacionAgricolaLinea } from '@agro/tipos';
import { ActionBar } from '../ActionBar';
import { Button } from '../Button';

export type CampoAgrupadoPlanificacion = {
  id: string;
  nombre: string;
  lineas: PlanificacionAgricolaLinea[];
};

export type ZonaAgrupadaPlanificacion = {
  id: string;
  nombre: string;
  campos: CampoAgrupadoPlanificacion[];
};

type ResumenGrupoPlanificacion = {
  hectareas: number;
  margen: number;
  pendientes: number;
  duplicadas: number;
};

type ArbolPlanificacionProps = {
  zonas: ZonaAgrupadaPlanificacion[];
  totalLineas: number;
  zonasAbiertas: Set<string>;
  camposAbiertos: Set<string>;
  puedeEditar: boolean;
  calcularResumenGrupo: (lineas: PlanificacionAgricolaLinea[]) => ResumenGrupoPlanificacion;
  formatearUsd: (valor: number, decimales?: number) => string;
  renderizarLinea: (linea: PlanificacionAgricolaLinea) => ReactNode;
  onAlternarTodo: () => void;
  onAlternarZona: (zonaId: string, abierta: boolean) => void;
  onAlternarCampo: (campoId: string, abierto: boolean) => void;
  onAlternarCamposZona: (event: MouseEvent<HTMLButtonElement>, zonaId: string, campoIds: string[]) => void;
  onQuitarLineas: (event: MouseEvent<HTMLButtonElement>, lineas: PlanificacionAgricolaLinea[], etiqueta: string) => void;
};

export function ArbolPlanificacion({
  zonas,
  totalLineas,
  zonasAbiertas,
  camposAbiertos,
  puedeEditar,
  calcularResumenGrupo,
  formatearUsd,
  renderizarLinea,
  onAlternarTodo,
  onAlternarZona,
  onAlternarCampo,
  onAlternarCamposZona,
  onQuitarLineas,
}: ArbolPlanificacionProps) {
  const todosAbiertos = zonas.length > 0
    && zonas.every((zona) => zonasAbiertas.has(zona.id))
    && zonas.flatMap((zona) => zona.campos).every((campo) => camposAbiertos.has(campo.id));

  return (
    <div className="planning-table">
      {zonas.length === 0 && (
        <p className="hint">{totalLineas === 0 ? 'No hay lotes activos para planificar. Primero crea o sincroniza lotes.' : 'No hay lineas que coincidan con los filtros aplicados.'}</p>
      )}
      {zonas.length > 0 && (
        <div className="planning-tree-toolbar">
          <span>Vista por zona y campo</span>
          <ActionBar compact>
            <Button variant="small" className="tree-toggle-button" onClick={onAlternarTodo}>
              {todosAbiertos ? 'Contraer todo' : 'Expandir todo'}
            </Button>
          </ActionBar>
        </div>
      )}
      {zonas.map((zona) => {
        const lineasZona = zona.campos.flatMap((campo) => campo.lineas);
        const resumenZona = calcularResumenGrupo(lineasZona);
        const zonaAbierta = zonasAbiertas.has(zona.id);

        return (
          <details
            className="planning-tree-zone"
            key={zona.id}
            open={zonaAbierta}
            onToggle={(event) => onAlternarZona(zona.id, event.currentTarget.open)}
          >
            <summary>
              <strong>{zona.nombre}</strong>
              <span>{lineasZona.length} linea(s)</span>
              <span>{resumenZona.hectareas.toFixed(2)} ha</span>
              <span>{formatearUsd(resumenZona.margen)}</span>
              {resumenZona.pendientes > 0 && <em>{resumenZona.pendientes} pendiente(s)</em>}
              {resumenZona.duplicadas > 0 && <em className="summary-danger">{resumenZona.duplicadas} duplicada(s)</em>}
              <div className="planning-tree-summary-actions">
                <Button
                  variant="small"
                  className="tree-toggle-button danger-button"
                  onClick={(event) => onQuitarLineas(event, lineasZona, zona.nombre)}
                  disabled={!puedeEditar}
                >
                  Quitar zona
                </Button>
                <Button variant="small" className="tree-toggle-button" onClick={(event) => onAlternarCamposZona(event, zona.id, zona.campos.map((campo) => campo.id))}>
                  {zonaAbierta && zona.campos.every((campo) => camposAbiertos.has(campo.id)) ? 'Contraer campos' : 'Expandir campos'}
                </Button>
              </div>
            </summary>
            {zonaAbierta && zona.campos.map((campo) => {
              const resumenCampo = calcularResumenGrupo(campo.lineas);
              const campoAbierto = camposAbiertos.has(campo.id);

              return (
                <details
                  className="planning-tree-field"
                  key={campo.id}
                  open={campoAbierto}
                  onToggle={(event) => onAlternarCampo(campo.id, event.currentTarget.open)}
                >
                  <summary>
                    <strong>{campo.nombre}</strong>
                    <span>{campo.lineas.length} linea(s)</span>
                    <span>{resumenCampo.hectareas.toFixed(2)} ha</span>
                    <span>{formatearUsd(resumenCampo.margen)}</span>
                    {resumenCampo.pendientes > 0 && <em>{resumenCampo.pendientes} pendiente(s)</em>}
                    {resumenCampo.duplicadas > 0 && <em className="summary-danger">{resumenCampo.duplicadas} duplicada(s)</em>}
                    <div className="planning-tree-summary-actions">
                      <Button
                        variant="small"
                        className="tree-toggle-button danger-button"
                        onClick={(event) => onQuitarLineas(event, campo.lineas, campo.nombre)}
                        disabled={!puedeEditar}
                      >
                        Quitar campo
                      </Button>
                    </div>
                  </summary>
                  {campoAbierto && (
                    <div className="planning-tree-lines">
                      {campo.lineas.map(renderizarLinea)}
                    </div>
                  )}
                </details>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}
