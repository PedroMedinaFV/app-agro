import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import type { RefObject } from 'react';
import type { SesionUsuario } from '@agro/tipos';
import { styles } from '../styles/mobile';
import { useDatosOperativosMobile } from '../hooks/useDatosOperativosMobile';
import { usePendientesMobile } from '../hooks/usePendientesMobile';
import { useFormularioRegistrosMobile } from '../hooks/useFormularioRegistrosMobile';

type Props = { sesion: SesionUsuario; sesionActual: RefObject<SesionUsuario | null>; onCerrarSesion: () => void };
export function PantallaOperativa({ sesion, sesionActual, onCerrarSesion }: Props) {
  const {
    esAdmin, datosOperativos, planificacionActiva, protocoloActivo, margenBruto, hectareas, campoSeleccionado,
    loteSeleccionado, lineaSeleccionada, actividadSeleccionada, protocoloSeleccionado, fichaLote, cargandoFichaLote,
    cargandoPlanificacion, errorPlanificacion, seleccionarSiguienteCampo, seleccionarSiguienteLote,
  } = useDatosOperativosMobile(sesion, sesionActual);
  const { pendientesAnteriores, pendientesOffline, sincronizandoOffline, sincronizarRegistrosPendientes } = usePendientesMobile(sesion, sesionActual);
  const {
    milimetros, setMilimetros, observaciones, setObservaciones, tituloObservacion, setTituloObservacion,
    descripcionObservacion, setDescripcionObservacion, severidadObservacion, setSeveridadObservacion,
    latitudObservacion, setLatitudObservacion, longitudObservacion, setLongitudObservacion, guardandoPrecipitacion,
    guardandoObservacion, guardarPrecipitacionMobile, guardarObservacionMobile, fotoSeleccionada,
    seleccionarFotoObservacion, tomarFotoObservacion,
  } = useFormularioRegistrosMobile(sesion, sesionActual, campoSeleccionado, loteSeleccionado, sincronizarRegistrosPendientes);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>Panel mobile</Text>
        <Text style={styles.subtitle}>Sesion activa para {sesion.usuario.email}</Text>
        <Text style={styles.note}>Rol: {sesion.usuario.rol}</Text>
        {cargandoPlanificacion && <Text style={styles.note}>Cargando campos y lotes asignados...</Text>}
        {errorPlanificacion && <Text style={styles.errorText}>{errorPlanificacion}</Text>}
        {esAdmin ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Empresas ERP</Text>
            <Text style={styles.note}>Gestiona empresas y sincronizacion desde web.</Text>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mi trabajo</Text>
            <Text style={styles.note}>Campos asignados: {datosOperativos.camposApp.length}</Text>
            <Text style={styles.note}>Lotes disponibles: {datosOperativos.lotesApp.length}</Text>
            <Text style={styles.note}>Planificaciones disponibles: {datosOperativos.planificaciones.length}</Text>
            <Text style={styles.note}>Actividades disponibles: {datosOperativos.actividadesApp?.length || 0}</Text>
            <Text style={styles.note}>Insumos de referencia: {datosOperativos.insumosApp?.length || 0}</Text>
            <Text style={styles.note}>Accion permitida: cargar registros de campo</Text>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Planificacion agricola</Text>
          <Text style={styles.note}>Campania: {planificacionActiva?.campaniaErpId || 'Sin planificacion'}</Text>
          <Text style={styles.note}>Estado: {planificacionActiva?.estado || 'Sin datos'}</Text>
          <Text style={styles.note}>Hectareas planificadas: {hectareas}</Text>
          <Text style={styles.note}>Margen bruto estimado: USD {margenBruto}</Text>
          <Text style={styles.note}>Mobile inicia como consulta; la edicion avanzada queda en web para el MVP.</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Protocolos productivos</Text>
          <Text style={styles.note}>Protocolo sugerido: {protocoloActivo?.nombre || 'Sin protocolo'}</Text>
          <Text style={styles.note}>Descripcion: {protocoloActivo?.descripcion || 'Sin datos'}</Text>
          <Text style={styles.note}>Costo estimado: USD {protocoloActivo?.costoEstimadoPorHa || 0} / ha</Text>
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
                  <Text style={styles.note}>Protocolo: {protocoloSeleccionado?.nombre || 'Sin protocolo'}</Text>
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
              <Text style={styles.note}>
                Geografia: {fichaLote?.geografia?.estado === 'procesado' ? 'Disponible' : fichaLote?.geografia?.estado || 'Sin archivo'}
              </Text>
              {fichaLote?.geografia?.superficieCalculadaHa !== undefined && (
                <Text style={styles.note}>Superficie KML/KMZ: {fichaLote.geografia.superficieCalculadaHa.toFixed(2)} ha</Text>
              )}
              <Text style={styles.note}>Cultivos ERP: {fichaLote?.cultivos.length ?? 0}</Text>
              {fichaLote?.cultivos.slice(0, 2).map((cultivo) => (
                <Text key={cultivo.id} style={styles.note}>
                  {cultivo.nombre} - {cultivo.campaniaNombre || 'Sin campania'} - {cultivo.hectareas} ha
                </Text>
              ))}
              <Text style={styles.note}>Planificaciones: {fichaLote?.planificaciones.length ?? (lineaSeleccionada ? 1 : 0)}</Text>
              {fichaLote?.planificaciones.slice(0, 2).map((linea) => (
                <Text key={linea.id} style={styles.note}>
                  {linea.tipoDocumento === 'anexo' ? `Anexo ${linea.numeroAnexo}: ` : ''}{linea.planificacionNombre} - {linea.actividadNombre || 'Sin actividad'} - MB USD {linea.margenBrutoEstimado}
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
              {pendientesAnteriores && <Text style={styles.note}>Hay registros anteriores que requieren recuperacion antes de enviarse. Se conservaron en este dispositivo.</Text>}
            </View>
          </>
        )}
        <Button title="Cerrar sesion" onPress={onCerrarSesion} />
      </View>
    </ScrollView>
  );
}
