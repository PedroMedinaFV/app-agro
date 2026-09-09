import { useEffect, useState } from 'react';
import { obtenerPermisosRol, SesionUsuario } from '@agro/tipos';
import { loginDemo, loginMicrosoft } from '../services/api';
import { startBackendActivity } from '../utils/backendActivity';

const microsoftClientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID || '';
const microsoftTenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
const microsoftRedirectUri = import.meta.env.VITE_MICROSOFT_REDIRECT_URI || window.location.origin;

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const texto = Array.from(array, (byte) => String.fromCharCode(byte)).join('');

  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function crearValorSeguro() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);

  return base64Url(bytes);
}

async function crearCodeChallenge(verifier: string) {
  const bytes = new TextEncoder().encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);

  return base64Url(digest);
}

async function intercambiarCodigoMicrosoft(code: string, codeVerifier: string) {
  const respuesta = await fetch(`https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: microsoftClientId,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: microsoftRedirectUri,
    }),
  });
  const contenido = await respuesta.json().catch(() => ({})) as { id_token?: string; error_description?: string };

  if (!respuesta.ok || !contenido.id_token) {
    throw new Error(contenido.error_description || 'Microsoft no devolvio un id_token valido.');
  }

  return contenido.id_token;
}

export function useDemoAuth() {
  const [sesion, setSesion] = useState<SesionUsuario | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrarModoDemo() {
    setCargando(true);
    setError('');
    const finishBackendActivity = startBackendActivity('Iniciando sesion...');

    try {
      setSesion(await loginDemo({ email: 'demo@agroapp.local', nombre: 'Usuario Demo', rol: 'admin' }));
    } catch (error) {
      // Fallback intencional: permite validar la UI aunque la API no este levantada.
      setError('API no disponible. Usando sesion demo local.');
      setSesion({
        token: 'demo-local-token',
        usuario: { id: 'demo-local', email: 'demo@agroapp.local', nombre: 'Usuario Demo', rol: 'admin' },
        origen: 'demo',
        permisos: obtenerPermisosRol('admin'),
      });
    } finally {
      finishBackendActivity();
      setCargando(false);
    }
  }

  async function entrarConMicrosoft() {
    setError('');

    if (!microsoftClientId) {
      setError('Falta configurar VITE_MICROSOFT_CLIENT_ID para iniciar sesion con Microsoft.');
      return;
    }

    setCargando(true);

    try {
      const state = crearValorSeguro();
      const codeVerifier = crearValorSeguro();
      const codeChallenge = await crearCodeChallenge(codeVerifier);

      sessionStorage.setItem('agro-ms-state', state);
      sessionStorage.setItem('agro-ms-code-verifier', codeVerifier);

      const authorizeUrl = new URL(`https://login.microsoftonline.com/${microsoftTenantId}/oauth2/v2.0/authorize`);
      authorizeUrl.search = new URLSearchParams({
        client_id: microsoftClientId,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        redirect_uri: microsoftRedirectUri,
        response_type: 'code',
        response_mode: 'query',
        scope: 'openid profile email',
        state,
      }).toString();

      window.location.assign(authorizeUrl.toString());
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo iniciar sesion con Microsoft.');
      setCargando(false);
    }
  }

  useEffect(() => {
    async function procesarRetornoMicrosoft() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorMicrosoft = params.get('error_description') || params.get('error');

      if (!code && !errorMicrosoft) {
        return;
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      if (errorMicrosoft) {
        setError(errorMicrosoft);
        return;
      }

      const stateEsperado = sessionStorage.getItem('agro-ms-state');
      const codeVerifier = sessionStorage.getItem('agro-ms-code-verifier');
      sessionStorage.removeItem('agro-ms-state');
      sessionStorage.removeItem('agro-ms-code-verifier');

      if (!stateEsperado || !codeVerifier || state !== stateEsperado) {
        setError('No se pudo validar el retorno de Microsoft.');
        return;
      }

      if (!code) {
        setError('Microsoft no devolvio codigo de autorizacion.');
        return;
      }

      setCargando(true);
      const finishBackendActivity = startBackendActivity('Iniciando sesion con Microsoft...');

      try {
        const idToken = await intercambiarCodigoMicrosoft(code, codeVerifier);
        setSesion(await loginMicrosoft(idToken));
      } catch (error) {
        setError(error instanceof Error ? error.message : 'No se pudo completar el login Microsoft.');
      } finally {
        finishBackendActivity();
        setCargando(false);
      }
    }

    procesarRetornoMicrosoft();
  }, []);

  function cerrarSesion() {
    setSesion(null);
  }

  return {
    sesion,
    error,
    cargando,
    entrarModoDemo,
    entrarConMicrosoft,
    cerrarSesion,
  };
}
