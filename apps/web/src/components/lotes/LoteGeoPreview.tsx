import type { LoteArchivoGeografico } from '@agro/tipos';

type PuntoGeo = [number, number] | [number, number, number];
type GeometriaGeoJson =
  | { type: 'Point'; coordinates: PuntoGeo }
  | { type: 'LineString'; coordinates: PuntoGeo[] }
  | { type: 'Polygon'; coordinates: PuntoGeo[][] };
type FeatureGeoJson = { type: 'Feature'; geometry?: GeometriaGeoJson | null };
type FeatureCollectionGeoJson = { type: 'FeatureCollection'; features: FeatureGeoJson[] };

function esPuntoGeo(valor: unknown): valor is PuntoGeo {
  return Array.isArray(valor)
    && valor.length >= 2
    && typeof valor[0] === 'number'
    && typeof valor[1] === 'number'
    && Number.isFinite(valor[0])
    && Number.isFinite(valor[1]);
}

function obtenerFeatureCollection(valor: unknown): FeatureCollectionGeoJson | undefined {
  if (!valor || typeof valor !== 'object') {
    return undefined;
  }

  const candidato = valor as { type?: unknown; features?: unknown };

  if (candidato.type !== 'FeatureCollection' || !Array.isArray(candidato.features)) {
    return undefined;
  }

  return candidato as FeatureCollectionGeoJson;
}

function obtenerPuntosGeometria(geometria: GeometriaGeoJson) {
  if (geometria.type === 'Point') {
    return [geometria.coordinates].filter(esPuntoGeo);
  }

  if (geometria.type === 'LineString') {
    return geometria.coordinates.filter(esPuntoGeo);
  }

  return geometria.coordinates.flat().filter(esPuntoGeo);
}

function crearProyectorGeoJson(features: FeatureGeoJson[]) {
  const puntos = features.flatMap((feature) => feature.geometry ? obtenerPuntosGeometria(feature.geometry) : []);

  if (!puntos.length) {
    return undefined;
  }

  const lons = puntos.map((punto) => punto[0]);
  const lats = puntos.map((punto) => punto[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const ancho = Math.max(maxLon - minLon, 0.000001);
  const alto = Math.max(maxLat - minLat, 0.000001);
  const padding = 12;
  const viewport = 200 - padding * 2;

  return (punto: PuntoGeo) => {
    const x = padding + ((punto[0] - minLon) / ancho) * viewport;
    const y = padding + ((maxLat - punto[1]) / alto) * viewport;

    return [x, y] as const;
  };
}

function crearPathLinea(puntos: PuntoGeo[], proyectar: (punto: PuntoGeo) => readonly [number, number]) {
  return puntos
    .filter(esPuntoGeo)
    .map((punto, indice) => {
      const [x, y] = proyectar(punto);

      return `${indice === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function LoteGeoPreview({ archivo }: { archivo: LoteArchivoGeografico }) {
  const geoJson = obtenerFeatureCollection(archivo.geometriaGeoJson);

  if (!geoJson || !geoJson.features.length) {
    return (
      <div className="geo-preview geo-preview-empty">
        {archivo.estado === 'rechazado' ? archivo.observaciones || 'Archivo rechazado.' : 'Sin geometria procesada.'}
      </div>
    );
  }

  const proyectar = crearProyectorGeoJson(geoJson.features);

  if (!proyectar) {
    return <div className="geo-preview geo-preview-empty">Sin coordenadas visibles.</div>;
  }

  return (
    <div className="geo-preview" aria-label={`Vista previa geografica de ${archivo.nombreArchivo}`}>
      <svg viewBox="0 0 200 200" role="img" aria-hidden="true">
        <rect x="1" y="1" width="198" height="198" rx="10" />
        {geoJson.features.map((feature, indiceFeature) => {
          const geometria = feature.geometry;

          if (!geometria) {
            return null;
          }

          if (geometria.type === 'Point' && esPuntoGeo(geometria.coordinates)) {
            const [x, y] = proyectar(geometria.coordinates);

            return <circle key={indiceFeature} cx={x} cy={y} r="3.5" />;
          }

          if (geometria.type === 'LineString') {
            const path = crearPathLinea(geometria.coordinates, proyectar);

            return path ? <path key={indiceFeature} d={path} /> : null;
          }

          if (geometria.type !== 'Polygon') {
            return null;
          }

          return geometria.coordinates.map((anillo, indiceAnillo) => {
            const path = crearPathLinea(anillo, proyectar);

            return path ? <path key={`${indiceFeature}-${indiceAnillo}`} d={`${path} Z`} className={indiceAnillo === 0 ? 'geo-polygon' : 'geo-hole'} /> : null;
          });
        })}
      </svg>
    </div>
  );
}
