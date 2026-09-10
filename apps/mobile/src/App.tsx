import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FichaLoteOperativoResponse, obtenerPermisosRol, PlanificacionSnapshot, RolUsuario, SesionUsuario } from '@agro/tipos';
import {
  crearObservacion,
  crearPrecipitacion,
  crearUrlSubidaAdjuntoObservacion,
  obtenerFichaLoteOperativo,
  obtenerPlanificacionSnapshot,
  subirArchivoAFirmaSupabase,
} from './services/api';
import { AdjuntoLocalPendiente, guardarRegistroLocal, leerRegistrosLocales } from './services/almacenamientoLocal';
import { sincronizarPendientes } from './services/sincronizacion';

const planificacionDemo: PlanificacionSnapshot = {
  sincronizadoEn: new Date().toISOString(),
  camposApp: [
    {
      id: 'campo-app-erp-241',
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
  lotesApp: [
    {
      id: 'lote-app-erp-724',
      clienteId: 'cliente-demo',
      campoAppId: 'campo-app-erp-241',
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
  conceptosGastosComerciales: [],
  gastosComercialesReferencia: [],
  estadiosReferencia: [
    { id: 'estadio-semilla-109', idEstadio: 109, codigo: 'Si', nombre: 'Siembra', ordenCronologico: 9, activo: true, origen: 'semilla' },
  ],
  serviciosApp: [
    { id: 'labor-ref-siembra', clienteId: 'cliente-demo', codigo: 'SIEM', nombre: 'Siembra contratista', unidadSugerida: 'ha', costoUnitarioSugerido: 62, estadoVinculacion: 'provisorio', activo: true, origen: 'semilla', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  ],
  protocolos: [
    {
      id: 'protocolo-girasol-media',
      clienteId: 'cliente-demo',
      nombre: 'Girasol tecnologia media',
      descripcion: 'Girasol - tecnologia media',
      campaniaErpId: 'empresa:mock:campania:961',
      actividadAppId: 'actividad-app-girasol',
      actividadErpId: 'empresa:mock:actividad:48',
      tipoFecha: 'relativa_siembra',
      fechaSiembra: '2026-10-15',
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
      escenarioOriginal: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lineas: [
        {
          id: 'linea-planificacion-1',
          planificacionId: 'planificacion-25-26-demo',
          empresaErpId: 'empresa:mock',
          campoAppId: 'campo-app-erp-241',
          campoErpId: 'empresa:mock:campo:241',
          loteAppId: 'lote-app-erp-724',
          loteErpId: 'empresa:mock:lote:724',
          actividadAppId: 'actividad-app-girasol',
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
  const [rol, setRol] = useState<RolUsuario>('operador_campo');
  const [campoSeleccionadoId, setCampoSeleccionadoId] = useState(planificacionDemo.camposApp[0]?.id || '');
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState(planificacionDemo.lotesApp[0]?.id || '');
  const [milimetros, setMilimetros] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [tituloObservacion, setTituloObservacion] = useState('');
  const [descripcionObservacion, setDescripcionObservacion] = useState('');
  const [severidadObservacion, setSeveridadObservacion] = useState<'baja' | 'media' | 'alta'>('media');
  const [latitudObservacion, setLatitudObservacion] = useState('');
  const [longitudObservacion, setLongitudObservacion] = useState('');
  const [fotoSeleccionada, setFotoSeleccionada] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [guardandoPrecipitacion, setGuardandoPrecipitacion] = useState(false);
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);
  const [pendientesOffline, setPendientesOffline] = useState(0);
  const [sincronizandoOffline, setSincronizandoOffline] = useState(false);
  const [planificacionOperativa, setPlanificacionOperativa] = useState<PlanificacionSnapshot>(planificacionDemo);
  const [fichaLote, setFichaLote] = useState<FichaLoteOperativoResponse | null>(null);
  const [cargandoFichaLote, setCargandoFichaLote] = useState(false);
  const [cargandoPlanificacion, setCargandoPlanificacion] = useState(false);
  const [errorPlanificacion, setErrorPlanificacion] = useState<string | null>(null);

  useEffect(() => {
    async function cargarDatosOperativos() {
      if (!sesion) {
        setPlanificacionOperativa(planificacionDemo);
        return;
      }

      setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);

      if (sesion.origen === 'demo' || sesion.token === 'demo-mobile-token') {
        setPlanificacionOperativa(planificacionDemo);
        setErrorPlanificacion(null);
        return;
      }

      setCargandoPlanificacion(true);
      try {
        const snapshot = await obtenerPlanificacionSnapshot(sesion.token);
        setPlanificacionOperativa(snapshot);
        setCampoSeleccionadoId(snapshot.camposApp[0]?.id || '');
        setLoteSeleccionadoId(snapshot.lotesApp[0]?.id || '');
        setErrorPlanificacion(null);
      } catch (error) {
        setPlanificacionOperativa(planificacionDemo);
        setErrorPlanificacion(error instanceof Error ? error.message : 'No se pudieron cargar los datos operativos.');
      } finally {
        setCargandoPlanificacion(false);
      }
    }

    void cargarDatosOperativos();
  }, [sesion]);

  useEffect(() => {
    async function cargarFichaLote() {
      if (!sesion || !loteSeleccionadoId || sesion.origen === 'demo' || sesion.token === 'demo-mobile-token') {
        setFichaLote(null);
        return;
      }

      setCargandoFichaLote(true);
      try {
        setFichaLote(await obtenerFichaLoteOperativo(loteSeleccionadoId, sesion.token));
      } catch {
        setFichaLote(null);
      } finally {
        setCargandoFichaLote(false);
      }
    }

    void cargarFichaLote();
  }, [loteSeleccionadoId, sesion]);

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
    const sesionActiva = sesion;
    const esAdmin = sesion.permisos.includes('erp:configurar');
    const datosOperativos = planificacionOperativa;
    const planificacionActiva = datosOperativos.planificaciones[0] || planificacionDemo.planificaciones[0];
    const protocoloActivo = datosOperativos.protocolos[0] || planificacionDemo.protocolos[0];
    const margenBruto = planificacionActiva.lineas.reduce((total, linea) => total + linea.margenBrutoEstimado, 0);
    const hectareas = planificacionActiva.lineas.reduce((total, linea) => total + linea.hectareasPlanificadas, 0);
    const campoSeleccionado = datosOperativos.camposApp.find((campo) => campo.id === campoSeleccionadoId) || datosOperativos.camposApp[0];
    const lotesDelCampo = datosOperativos.lotesApp.filter((lote) => lote.campoAppId === campoSeleccionado?.id);
    const loteSeleccionado = lotesDelCampo.find((lote) => lote.id === loteSeleccionadoId) || lotesDelCampo[0];
    const lineaSeleccionada = planificacionActiva.lineas.find((linea) => linea.loteAppId === loteSeleccionado?.id);
    const actividadSeleccionada = datosOperativos.actividadesApp?.find((actividad) => actividad.id === lineaSeleccionada?.actividadAppId);
    const protocoloSeleccionado = datosOperativos.protocolos.find((protocolo) => protocolo.id === lineaSeleccionada?.protocoloId) || protocoloActivo;

    function seleccionarSiguienteCampo() {
      const campos = datosOperativos.camposApp;
      if (!campos.length) {
        setCampoSeleccionadoId('');
        setLoteSeleccionadoId('');
        return;
      }

      const indiceActual = campos.findIndex((campo) => campo.id === campoSeleccionado?.id);
      const siguiente = campos[(indiceActual + 1) % campos.length];

      setCampoSeleccionadoId(siguiente.id);
      setLoteSeleccionadoId(datosOperativos.lotesApp.find((lote) => lote.campoAppId === siguiente.id)?.id || '');
    }

    function seleccionarSiguienteLote() {
      if (!lotesDelCampo.length) {
        setLoteSeleccionadoId('');
        return;
      }

      const indiceActual = lotesDelCampo.findIndex((lote) => lote.id === loteSeleccionado?.id);
      setLoteSeleccionadoId(lotesDelCampo[(indiceActual + 1) % lotesDelCampo.length].id);
    }

    async function guardarPrecipitacionMobile() {
      const milimetrosNumericos = Number(milimetros);

      if (!campoSeleccionado || !Number.isFinite(milimetrosNumericos) || milimetrosNumericos <= 0) {
        Alert.alert('Precipitaciones', 'Selecciona campo e informa milimetros mayores a cero.');
        return;
      }

      const payload = {
        campoAppId: campoSeleccionado.id,
        loteAppId: loteSeleccionado?.id,
        milimetros: milimetrosNumericos,
        fechaEvento: new Date().toISOString(),
        observaciones: observaciones.trim() || undefined,
        origen: 'mobile' as const,
      };

      setGuardandoPrecipitacion(true);
      try {
        if (sesionActiva.origen === 'demo' || sesionActiva.token === 'demo-mobile-token') {
          await guardarRegistroLocal({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            tipo: 'precipitacion',
            payload,
            creadoEn: new Date().toISOString(),
            sincronizado: false,
          });
          setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);
          Alert.alert('Precipitaciones', 'Registro guardado como pendiente mobile.');
        } else {
          await crearPrecipitacion(payload, sesionActiva.token);
          Alert.alert('Precipitaciones', 'Precipitacion enviada al backend.');
        }

        setMilimetros('');
        setObservaciones('');
      } catch (error) {
        await guardarRegistroLocal({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tipo: 'precipitacion',
          payload,
          creadoEn: new Date().toISOString(),
          sincronizado: false,
        });
        setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);
        Alert.alert('Sin conexion', 'No se pudo enviar al backend. Quedo pendiente para sincronizar.');
      } finally {
        setGuardandoPrecipitacion(false);
      }
    }

    async function guardarObservacionMobile() {
      if (!campoSeleccionado || !tituloObservacion.trim() || !descripcionObservacion.trim()) {
        Alert.alert('Observaciones', 'Selecciona campo, titulo y descripcion.');
        return;
      }

      const latitud = latitudObservacion.trim() ? Number(latitudObservacion) : undefined;
      const longitud = longitudObservacion.trim() ? Number(longitudObservacion) : undefined;

      if ((latitud !== undefined && !Number.isFinite(latitud)) || (longitud !== undefined && !Number.isFinite(longitud))) {
        Alert.alert('Observaciones', 'Las coordenadas deben ser numericas.');
        return;
      }

      const nombreFoto = fotoSeleccionada?.fileName || `observacion-${Date.now()}.jpg`;
      const mimeFoto = fotoSeleccionada?.mimeType || 'image/jpeg';
      const tamanioFoto = fotoSeleccionada?.fileSize || 1;
      const adjuntosLocales: AdjuntoLocalPendiente[] = fotoSeleccionada
        ? [{
          uri: fotoSeleccionada.uri,
          nombreArchivo: nombreFoto,
          mimeType: mimeFoto,
          tamanioBytes: tamanioFoto,
        }]
        : [];

      const payload = {
        campoAppId: campoSeleccionado.id,
        loteAppId: loteSeleccionado?.id,
        titulo: tituloObservacion.trim(),
        descripcion: descripcionObservacion.trim(),
        severidad: severidadObservacion,
        latitud,
        longitud,
        fechaEvento: new Date().toISOString(),
        origen: 'mobile' as const,
      };

      setGuardandoObservacion(true);
      try {
        if (sesionActiva.origen === 'demo' || sesionActiva.token === 'demo-mobile-token') {
          await guardarRegistroLocal({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            tipo: 'observacion',
            payload,
            adjuntosLocales,
            creadoEn: new Date().toISOString(),
            sincronizado: false,
          });
          setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);
          Alert.alert('Observaciones', 'Observacion guardada como pendiente mobile.');
        } else {
          const adjuntoSubido = fotoSeleccionada
            ? await crearUrlSubidaAdjuntoObservacion({
              nombreArchivo: nombreFoto,
              mimeType: mimeFoto,
              tamanioBytes: tamanioFoto,
            }, sesionActiva.token)
            : null;

          if (fotoSeleccionada && adjuntoSubido) {
            await subirArchivoAFirmaSupabase(adjuntoSubido.signedUploadUrl, fotoSeleccionada.uri, mimeFoto);
          }

          await crearObservacion({
            ...payload,
            adjuntos: fotoSeleccionada && adjuntoSubido
              ? [{
                storageBucket: adjuntoSubido.storageBucket,
                storagePath: adjuntoSubido.storagePath,
                nombreArchivo: nombreFoto,
                mimeType: mimeFoto,
                tamanioBytes: tamanioFoto,
                estado: 'disponible',
              }]
              : undefined,
          }, sesionActiva.token);
          Alert.alert('Observaciones', 'Observacion enviada al backend.');
        }

        setTituloObservacion('');
        setDescripcionObservacion('');
        setLatitudObservacion('');
        setLongitudObservacion('');
        setFotoSeleccionada(null);
      } catch {
        await guardarRegistroLocal({
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          tipo: 'observacion',
          payload,
          adjuntosLocales,
          creadoEn: new Date().toISOString(),
          sincronizado: false,
        });
        setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);
        Alert.alert('Sin conexion', 'No se pudo enviar al backend. Quedo pendiente para sincronizar.');
      } finally {
        setGuardandoObservacion(false);
      }
    }

    async function sincronizarRegistrosPendientes() {
      setSincronizandoOffline(true);
      try {
        const resultado = await sincronizarPendientes(sesionActiva.token);
        setPendientesOffline((await leerRegistrosLocales()).filter((item) => !item.sincronizado).length);

        if (resultado.ok) {
          Alert.alert('Sincronizacion', `Registros sincronizados: ${resultado.sincronizados}`);
        } else {
          Alert.alert('Sincronizacion', resultado.error || `Quedan pendientes: ${resultado.restantes}`);
        }
      } finally {
        setSincronizandoOffline(false);
      }
    }

    async function seleccionarFotoObservacion() {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert('Observaciones', 'Necesitamos permiso para acceder a tus fotos.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (!resultado.canceled) {
        setFotoSeleccionada(resultado.assets[0]);
      }
    }

    async function tomarFotoObservacion() {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert('Observaciones', 'Necesitamos permiso para usar la camara.');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.82,
      });

      if (!resultado.canceled) {
        setFotoSeleccionada(resultado.assets[0]);
      }
    }

    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <Text style={styles.title}>Panel mobile</Text>
          <Text style={styles.subtitle}>Sesion demo activa para {sesion.usuario.email}</Text>
          <Text style={styles.note}>Rol: {sesion.usuario.rol}</Text>
          {cargandoPlanificacion && <Text style={styles.note}>Cargando campos y lotes asignados...</Text>}
          {errorPlanificacion && <Text style={styles.errorText}>{errorPlanificacion}</Text>}
          {esAdmin ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Empresas ERP</Text>
              <Text style={styles.note}>Seleccion demo: 1 empresa AGRO</Text>
              <Text style={styles.note}>x-company: 1</Text>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mi trabajo</Text>
              <Text style={styles.note}>Campos asignados: {datosOperativos.camposApp.length}</Text>
              <Text style={styles.note}>Lotes disponibles: {datosOperativos.lotesApp.length}</Text>
              <Text style={styles.note}>Campania actual: 19/20</Text>
              <Text style={styles.note}>Actividades disponibles: {datosOperativos.actividadesApp?.length || 0}</Text>
              <Text style={styles.note}>Insumos de referencia: {datosOperativos.insumosApp?.length || 0}</Text>
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
          {!esAdmin && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Supuestos comerciales del lote</Text>
                <Text style={styles.note}>Campo: {campoSeleccionado?.nombre || 'Sin campo'}</Text>
                <Text style={styles.note}>Lote: {loteSeleccionado?.nombre || 'Sin lote'}</Text>
                {lineaSeleccionada ? (
                  <>
                    <Text style={styles.note}>Actividad: {actividadSeleccionada?.nombre || lineaSeleccionada.actividadErpId || 'Sin actividad'}</Text>
                    <Text style={styles.note}>Destino: {lineaSeleccionada.destinoVenta}</Text>
                    <Text style={styles.note}>Precio: USD {lineaSeleccionada.precioVentaEstimado} / tn</Text>
                    <Text style={styles.note}>Rinde estimado: {lineaSeleccionada.rindeEstimado} tn/ha</Text>
                    <Text style={styles.note}>Gastos comerciales: USD {lineaSeleccionada.gastosComercialesEstimados}</Text>
                    <Text style={styles.note}>Protocolo: {protocoloSeleccionado.nombre}</Text>
                    <Text style={styles.note}>Margen bruto: USD {lineaSeleccionada.margenBrutoEstimado}</Text>
                  </>
                ) : (
                  <Text style={styles.note}>No hay una linea de planificacion asociada al lote seleccionado.</Text>
                )}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ficha del lote</Text>
                {cargandoFichaLote && <Text style={styles.note}>Actualizando ficha operativa...</Text>}
                <Text style={styles.note}>Superficie total: {fichaLote?.lote.superficieTotal ?? loteSeleccionado?.superficieTotal ?? 0} ha</Text>
                <Text style={styles.note}>Superficie productiva: {fichaLote?.lote.superficieProductiva ?? loteSeleccionado?.superficieProductiva ?? 0} ha</Text>
                <Text style={styles.note}>Estado: {fichaLote?.lote.estadoVinculacion ?? loteSeleccionado?.estadoVinculacion ?? 'sin datos'}</Text>
                <Text style={styles.note}>Zona: {fichaLote?.zona?.nombre || 'Sin zona informada'}</Text>
                <Text style={styles.note}>Cultivos ERP: {fichaLote?.cultivos.length ?? 0}</Text>
                {fichaLote?.cultivos.slice(0, 2).map((cultivo) => (
                  <Text key={cultivo.id} style={styles.note}>
                    {cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas} ha
                  </Text>
                ))}
                <Text style={styles.note}>Planificaciones: {fichaLote?.planificaciones.length ?? (lineaSeleccionada ? 1 : 0)}</Text>
                {fichaLote?.planificaciones.slice(0, 2).map((linea) => (
                  <Text key={linea.id} style={styles.note}>
                    {linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado}
                  </Text>
                ))}
                <Text style={styles.note}>
                  Lluvias ultimos 30 dias: {fichaLote?.precipitaciones.milimetrosUltimos30Dias ?? 0} mm
                </Text>
                <Text style={styles.note}>
                  Observaciones: {fichaLote?.observaciones.cantidadRegistros ?? 0} ({fichaLote?.observaciones.cantidadAlta ?? 0} alta)
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Observaciones</Text>
                <Text style={styles.note}>Campo: {campoSeleccionado?.nombre || 'Sin campo'}</Text>
                <Text style={styles.note}>Lote: {loteSeleccionado?.nombre || 'Campo completo'}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Titulo"
                  value={tituloObservacion}
                  onChangeText={setTituloObservacion}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  placeholder="Descripcion de lo observado"
                  value={descripcionObservacion}
                  onChangeText={setDescripcionObservacion}
                />
                <View style={styles.buttonSpacing}>
                  <Button
                    title={`Severidad: ${severidadObservacion}`}
                    onPress={() => setSeveridadObservacion(severidadObservacion === 'baja' ? 'media' : severidadObservacion === 'media' ? 'alta' : 'baja')}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Latitud opcional"
                  value={latitudObservacion}
                  onChangeText={setLatitudObservacion}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Longitud opcional"
                  value={longitudObservacion}
                  onChangeText={setLongitudObservacion}
                />
                <View style={styles.buttonSpacing}>
                  <Button title="Elegir foto" onPress={seleccionarFotoObservacion} />
                </View>
                <View style={styles.buttonSpacing}>
                  <Button title="Tomar foto" onPress={tomarFotoObservacion} />
                </View>
                {fotoSeleccionada && (
                  <Text style={styles.note}>
                    Foto: {fotoSeleccionada.fileName || 'imagen seleccionada'}
                  </Text>
                )}
                <View style={styles.buttonSpacing}>
                  <Button
                    title={guardandoObservacion ? 'Guardando...' : 'Guardar observacion'}
                    disabled={guardandoObservacion}
                    onPress={guardarObservacionMobile}
                  />
                </View>
                <View style={styles.buttonSpacing}>
                  <Button
                    title={sincronizandoOffline ? 'Sincronizando...' : 'Sincronizar pendientes'}
                    disabled={sincronizandoOffline || pendientesOffline === 0}
                    onPress={sincronizarRegistrosPendientes}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Precipitaciones</Text>
                <Text style={styles.note}>Campo: {campoSeleccionado?.nombre || 'Sin campo'}</Text>
                <View style={styles.buttonSpacing}>
                  <Button title="Cambiar campo" onPress={seleccionarSiguienteCampo} />
                </View>
                <Text style={styles.note}>Lote: {loteSeleccionado?.nombre || 'Campo completo'}</Text>
                <View style={styles.buttonSpacing}>
                  <Button title="Cambiar lote" onPress={seleccionarSiguienteLote} />
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Milimetros"
                  value={milimetros}
                  onChangeText={setMilimetros}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Observaciones"
                  value={observaciones}
                  onChangeText={setObservaciones}
                />
                <View style={styles.buttonSpacing}>
                  <Button
                    title={guardandoPrecipitacion ? 'Guardando...' : 'Guardar precipitacion'}
                    disabled={guardandoPrecipitacion}
                    onPress={guardarPrecipitacionMobile}
                  />
                </View>
                <Text style={styles.note}>Pendientes de sincronizacion: {pendientesOffline}</Text>
              </View>
            </>
          )}
          <Button title="Cerrar sesion" onPress={() => setSesion(null)} />
        </View>
      </ScrollView>
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
          <Button
            title={`Rol: ${rol === 'admin' ? 'Admin' : rol === 'planificador' ? 'Planificador' : 'Operador de campo'}`}
            onPress={() => setRol(rol === 'admin' ? 'planificador' : rol === 'planificador' ? 'operador_campo' : 'admin')}
          />
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
  errorText: {
    marginTop: 12,
    color: '#991b1b',
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
  textArea: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
});
