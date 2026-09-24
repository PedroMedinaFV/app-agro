import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { PlanificacionAgricolaLinea } from '@agro/tipos';

type GrupoCampoPlanificacion = {
  id: string;
  nombre: string;
  lineas: PlanificacionAgricolaLinea[];
};

type GrupoZonaPlanificacion = {
  id: string;
  nombre: string;
  campos: GrupoCampoPlanificacion[];
};

export function useExpansionArbolPlanificacion(lineasAgrupadas: GrupoZonaPlanificacion[]) {
  const [zonasAbiertas, setZonasAbiertas] = useState<Set<string>>(new Set());
  const [camposAbiertos, setCamposAbiertos] = useState<Set<string>>(new Set());

  function alternarZona(zonaId: string, abierta: boolean) {
    setZonasAbiertas((actuales) => {
      const siguientes = new Set(actuales);

      if (abierta) {
        siguientes.add(zonaId);
      } else {
        siguientes.delete(zonaId);
      }

      return siguientes;
    });
  }

  function alternarCampo(campoId: string, abierto: boolean) {
    setCamposAbiertos((actuales) => {
      const siguientes = new Set(actuales);

      if (abierto) {
        siguientes.add(campoId);
      } else {
        siguientes.delete(campoId);
      }

      return siguientes;
    });
  }

  function expandirTodo() {
    setZonasAbiertas(new Set(lineasAgrupadas.map((zona) => zona.id)));
    setCamposAbiertos(new Set(lineasAgrupadas.flatMap((zona) => zona.campos.map((campo) => campo.id))));
  }

  function contraerTodo() {
    setZonasAbiertas(new Set());
    setCamposAbiertos(new Set());
  }

  function alternarTodoArbol() {
    const todasLasZonasAbiertas = lineasAgrupadas.length > 0 && lineasAgrupadas.every((zona) => zonasAbiertas.has(zona.id));
    const todosLosCamposAbiertos = lineasAgrupadas
      .flatMap((zona) => zona.campos)
      .every((campo) => camposAbiertos.has(campo.id));

    if (todasLasZonasAbiertas && todosLosCamposAbiertos) {
      contraerTodo();
    } else {
      expandirTodo();
    }
  }

  function expandirCamposDeZona(campoIds: string[]) {
    setCamposAbiertos((actuales) => new Set([...actuales, ...campoIds]));
  }

  function contraerCamposDeZona(campoIds: string[]) {
    setCamposAbiertos((actuales) => {
      const siguientes = new Set(actuales);

      for (const campoId of campoIds) {
        siguientes.delete(campoId);
      }

      return siguientes;
    });
  }

  function alternarCamposDeZona(event: MouseEvent<HTMLButtonElement>, zonaId: string, campoIds: string[]) {
    event.preventDefault();
    event.stopPropagation();

    setZonasAbiertas((actuales) => new Set([...actuales, zonaId]));

    const zonaEstaAbierta = zonasAbiertas.has(zonaId);
    const todosLosCamposAbiertos = campoIds.length > 0 && campoIds.every((campoId) => camposAbiertos.has(campoId));

    if (zonaEstaAbierta && todosLosCamposAbiertos) {
      contraerCamposDeZona(campoIds);
    } else {
      expandirCamposDeZona(campoIds);
    }
  }

  return {
    zonasAbiertas,
    camposAbiertos,
    alternarZona,
    alternarCampo,
    alternarTodoArbol,
    alternarCamposDeZona,
  };
}
