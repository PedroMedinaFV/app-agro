import { ReactNode, useState } from 'react';
import { SesionUsuario } from '@agro/tipos';

type VistaApp = 'inicio' | 'campos' | 'lotes' | 'planificacion' | 'protocolos' | 'precios' | 'gastos' | 'padrones-conceptos-gastos' | 'padrones-destinos' | 'padrones-labores' | 'padrones-insumos' | 'empresas-erp';

interface LayoutProps {
  sesion: SesionUsuario;
  sidebarAbierto: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  vista: VistaApp;
  onVistaChange: (vista: VistaApp) => void;
  titulo: string;
  descripcion: string;
  puedeConfigurarErp: boolean;
  puedeConfigurarPlanificacion: boolean;
  children: ReactNode;
}

export function Layout({
  sesion,
  sidebarAbierto,
  onToggleSidebar,
  onLogout,
  vista,
  onVistaChange,
  titulo,
  descripcion,
  puedeConfigurarErp,
  puedeConfigurarPlanificacion,
  children,
}: LayoutProps) {
  const [padronesAbierto, setPadronesAbierto] = useState(vista.startsWith('padrones-'));
  const navItems = [
    { vista: 'inicio' as const, label: 'Inicio', icon: 'IN' },
    { vista: 'planificacion' as const, label: 'Planificacion', icon: 'PL' },
    { vista: 'protocolos' as const, label: 'Protocolos', icon: 'PR' },
    { vista: 'precios' as const, label: 'Precios', icon: 'US' },
    { vista: 'gastos' as const, label: 'Gastos', icon: 'GC' },
    { label: 'Siembra', icon: 'SI' },
    { label: 'Cosecha', icon: 'CO' },
    { label: 'Monitoreos', icon: 'MO' },
  ];
  const padronesItems = [
    { vista: 'padrones-conceptos-gastos' as const, label: 'Conceptos comerciales' },
    { vista: 'padrones-destinos' as const, label: 'Destinos' },
    { vista: 'padrones-labores' as const, label: 'Labores' },
    { vista: 'padrones-insumos' as const, label: 'Insumos' },
    { label: 'Estadios' },
    { label: 'Zonas' },
    { vista: 'campos' as const, label: 'Campos' },
    { vista: 'lotes' as const, label: 'Lotes' },
    { label: 'Especies' },
    { label: 'Actividades' },
  ];
  const padronActivo = vista.startsWith('padrones-');

  return (
    <main className="app-container">
      <header className="app-header">
        <button 
          className="hamburger-btn" 
          onClick={onToggleSidebar} 
          title={sidebarAbierto ? 'Cerrar menu' : 'Abrir menu'}
        >
          <span className="hamburger-icon"></span>
        </button>
        <div className="header-title">
          <h1>Agro App</h1>
        </div>
        <div className="header-user">
          <span>{sesion.usuario.nombre}</span>
          <button className="ghost" onClick={onLogout}>Cerrar</button>
        </div>
      </header>

      <div className={`app-shell ${!sidebarAbierto ? 'sidebar-collapsed' : ''}`}>
        <aside className={`sidebar ${!sidebarAbierto ? 'collapsed' : ''}`}>
          <div className="sidebar-profile">
            <strong className="sidebar-logo">AA</strong>
            <p className="user">{sesion.usuario.rol}</p>
          </div>
          <nav>
            {navItems.map((item) => (
              <a
                key={item.label}
                className={item.vista && vista === item.vista ? 'active' : ''}
                onClick={() => item.vista && onVistaChange(item.vista)}
                title={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
            {puedeConfigurarPlanificacion && (
              <div className={`nav-group ${padronesAbierto ? 'open' : ''}`}>
                <button
                  className={`nav-group-trigger ${padronActivo ? 'active' : ''}`}
                  onClick={() => setPadronesAbierto((actual) => !actual)}
                  title="Padrones"
                  type="button"
                >
                  <span className="nav-icon">PM</span>
                  <span className="nav-label">Padrones</span>
                  <span className="nav-chevron">{padronesAbierto ? 'v' : '>'}</span>
                </button>
                {padronesAbierto && (
                  <div className="nav-submenu">
                    {padronesItems.map((item) => (
                      <button
                        key={item.label}
                        className={item.vista && vista === item.vista ? 'active' : ''}
                        disabled={!item.vista}
                        onClick={() => item.vista && onVistaChange(item.vista)}
                        title={item.vista ? item.label : `${item.label} - pendiente`}
                        type="button"
                      >
                        <span className="nav-subdot" />
                        <span className="nav-label">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {puedeConfigurarErp && (
              <a 
                className={vista === 'empresas-erp' ? 'active' : ''} 
                onClick={() => onVistaChange('empresas-erp')} 
                title="Empresas ERP"
              >
                <span className="nav-icon">ER</span>
                <span className="nav-label">Empresas ERP</span>
              </a>
            )}
          </nav>
        </aside>

        <section className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">Panel operativo</p>
              <h1>{titulo}</h1>
              <p className="hint">{descripcion}</p>
            </div>
          </header>

          {children}
        </section>
      </div>
    </main>
  );
}
