type RegistroPendiente = {
  id: string;
  tipo: string;
  payload: unknown;
  creadoEn: string;
  sincronizado: boolean;
};

class OfflineStore {
  private pendientes: RegistroPendiente[] = [];

  agregarPendiente(tipo: string, payload: unknown) {
    const registro: RegistroPendiente = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      tipo,
      payload,
      creadoEn: new Date().toISOString(),
      sincronizado: false,
    };

    this.pendientes.push(registro);
    return registro;
  }

  listarPendientes() {
    return this.pendientes;
  }

  marcarSincronizado(id: string) {
    this.pendientes = this.pendientes.map((item) =>
      item.id === id ? { ...item, sincronizado: true } : item
    );
  }
}

export const offlineStore = new OfflineStore();
