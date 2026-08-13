import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { obtenerPermisosRol, PlanificacionSnapshot, RolUsuario, SesionUsuario } from '@agro/tipos';

const planificacionDemo: PlanificacionSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  camposPlanificacion: [
    {
      id: 'campo-planificacion-erp-241',
      clienteId: 'cliente-demo',
      empresaErpId: 'empresa:mock',
      campoErpId: 'empresa:mock:campo:241',
      nombre: 'LA PROVIDENCIA',
      codigoInterno: '00006',
      estadoVinculacion: 'vinculado_erp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  lotesPlanificacion: [
    {
      id: 'lote-planificacion-erp-724',
      clienteId: 'cliente-demo',
      campoPlanificacionId: 'campo-planificacion-erp-241',
      loteErpId: 'empresa:mock:lote:724',
      nombre: 'CABALLO LOCO 1',
      codigoInterno: 'CL1',
      superficieTotal: 60,
      superficieProductiva: 60,
      estadoVinculacion: 'vinculado_erp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  destinosReferencia: [],
  preciosReferencia: [],
  gastosComercialesReferencia: [],
  protocolos: [
    {
      id: 'protocolo-girasol-media',
      clienteId: 'cliente-demo',
      nombre: 'Girasol tecnologia media',
      descripcion: 'Girasol - tecnologia media',
      actividadErpId: 'empresa:mock:actividad:48',
      especieErpId: 'empresa:mock:especie:33',
      costoEstimadoPorHa: 520,
      activo: true,
      createdAt: '2026-01-15T10:00:00.000Z',
      updatedAt: '2026-08-10T10:00:00.000Z',
    },
  ],
  planificaciones: [
    {
      id: 'planificacion-25-26-demo',
      clienteId: 'cliente-demo',
      campaniaErpId: 'empresa:mock:campania:961',
      nombre: 'Planificacion agricola demo',
      estado: 'borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineas: [
        {
          id: 'linea-planificacion-1',
          planificacionId: 'planificacion-25-26-demo',
          empresaErpId: 'empresa:mock',
          campoPlanificacionId: 'campo-planificacion-erp-241',
          campoErpId: 'empresa:mock:campo:241',
          lotePlanificacionId: 'lote-planificacion-erp-724',
          loteErpId: 'empresa:mock:lote:724',
          actividadErpId: 'empresa:mock:actividad:48',
          destinoVenta: 'Puerto Quequen',
          destinoVentaManual: false,
          precioVentaEstimado: 315,
          precioVentaManual: false,
          hectareasPlanificadas: 60,
          rindeEstimado: 2.4,
          gastosComercialesEstimados: 2520,
          protocoloId: 'protocolo-girasol-media',
          ingresoBrutoEstimado: 45360,
          ingresoNetoEstimado: 42840,
          costoProduccionEstimado: 31200,
          margenBrutoEstimado: 11640,
          estado: 'borrador',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  ],
};

export default function App() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [email, setEmail] = useState('demo@agroapp.local');
  const [rol, setRol] = useState<RolUsuario>('usuario');

  function entrarModoDemo() {
    // Mobile mantiene el mismo contrato de sesion que web/backend mientras no haya API disponible.
    setSesion({
      token: 'demo-mobile-token',
      usuario: { id: 'demo-mobile', email, nombre: 'Usuario Demo', rol },
      origen: 'demo',
      permisos: obtenerPermisosRol(rol),
    });
  }

  if (sesion) {
    const esAdmin = sesion.permisos.includes('erp:configurar');
    const planificacionActiva = planificacionDemo.planificaciones[0];
    const protocoloActivo = planificacionDemo.protocolos[0];
    const margenBruto = planificacionActiva.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
    const hectareas = planificacionActiva.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);

    return (
      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Panel mobile</Text>
          <Text style={styles.subtitle}>Sesion demo activa para {sesion.usuario.email}</Text>
          <Text style={styles.note}>Rol: {sesion.usuario.rol}</Text>
          {esAdmin ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Empresas ERP</Text>
              <Text style={styles.note}>Seleccion demo: 1 empresa AGRO</Text>
              <Text style={styles.note}>x-company: 1</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi trabajo</Text>
              <Text style={styles.note}>Campos asignados: 1</Text>
              <Text style={styles.note}>Lotes disponibles: 2</Text>
              <Text style={styles.note}>Campania actual: 19/20</Text>
              <Text style={styles.note}>Cultivos disponibles: 1</Text>
              <Text style={styles.note}>Insumos de referencia: 2</Text>
              <Text style={styles.note}>Accion permitida: cargar registros de campo</Text>
            </View>
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Planificacion agricola</Text>
            <Text style={styles.note}>Campania: 19/20</Text>
            <Text style={styles.note}>Estado: {planificacionActiva.estado}</Text>
            <Text style={styles.note}>Hectareas planificadas: {hectareas}</Text>
            <Text style={styles.note}>Margen bruto estimado: USD {margenBruto}</Text>
            <Text style={styles.note}>Mobile inicia como consulta; la edicion avanzada queda en web para el MVP.</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Protocolos productivos</Text>
            <Text style={styles.note}>Protocolo sugerido: {protocoloActivo.nombre}</Text>
            <Text style={styles.note}>Descripcion: {protocoloActivo.descripcion}</Text>
            <Text style={styles.note}>Costo estimado: USD {protocoloActivo.costoEstimadoPorHa} / ha</Text>
          </View>
          <Button title="Cerrar sesion" onPress={() => setSesion(null)} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesion</Text>
        <Text style={styles.subtitle}>Agro App - mobile demo</Text>
        <TextInput style={styles.input} placeholder="Correo" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Contrasena" secureTextEntry />
        <View style={styles.buttonSpacing}>
          <Button title={`Rol: ${rol}`} onPress={() => setRol(rol === 'admin' ? 'usuario' : 'admin')} />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="Entrar en modo demo" onPress={entrarModoDemo} />
        </View>
        <View style={styles.buttonSpacing}>
          <Button title="Continuar con Microsoft" onPress={() => {}} />
        </View>
        <Text style={styles.note}>Pantalla local de prueba. La autenticacion real se conecta despues con backend y Microsoft.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minHeight: 720,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f7fb',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    color: '#4b5563',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  buttonSpacing: {
    marginTop: 12,
  },
  note: {
    marginTop: 18,
    color: '#6b7280',
    fontSize: 13,
  },
  section: {
    marginTop: 18,
    marginBottom: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
});
