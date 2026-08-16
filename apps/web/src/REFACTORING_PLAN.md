# Plan de Refactorización de App.tsx

## Estructura Actual
- **App.tsx**: 2200+ líneas con todo mezclado (estado, lógica, UI de 4 vistas)
- Archivos creados: Layout, LoginPanel, HomeScreen (v1)

## Estructura Propuesta (Refactorización Gradual)

```
src/
├── App.tsx (refactorizado - solo routing y estado global)
├── screens/
│   ├── HomeScreen.tsx (vista inicio) ✓
│   ├── PlanificacionScreen.tsx (vista planificacion)
│   ├── ProtocolosScreen.tsx (vista protocolos)
│   └── EmpresasErpScreen.tsx (vista empresas-erp)
├── components/
│   ├── Layout.tsx (header, sidebar, estructura) ✓
│   ├── LoginPanel.tsx (panel de login) ✓
│   └── Navigation.tsx (navs compartidas)
├── hooks/
│   └── useAppState.ts (estado compartido - futuro)
├── types/
│   └── web.ts (tipos locales para la web)
└── services/
    └── api.ts (ya existe)
```

## Estrategia de Refactorización Gradual

### Fase 1: Extraer Componentes Puros (ACTUAL)
**Meta**: Separar UI sin cambiar la lógica principal

1. ✓ Crear `components/Layout.tsx` - wrapper de estructura
2. ✓ Crear `components/LoginPanel.tsx` - panel de login
3. ✓ Crear `screens/HomeScreen.tsx` - vista inicio (props-based)
4. → Crear `screens/PlanificacionScreen.tsx` - vista planificación
5. → Crear `screens/ProtocolosScreen.tsx` - vista protocolos
6. → Crear `screens/EmpresasErpScreen.tsx` - vista empresas ERP

**Cómo**: Extraer bloques de JSX en componentes funcionales que reciben props

### Fase 2: Refactorizar App.tsx Gradualmente
**Meta**: Usar componentes de pantalla sin cambiar estado

```typescript
// ANTES:
if (vista === 'inicio') {
  // 100+ líneas de JSX
}

// DESPUÉS:
{vista === 'inicio' && (
  <HomeScreen {...todosLosProps} />
)}
```

### Fase 3: Extraer Custom Hooks
**Meta**: Lógica reutilizable en hooks

- `useEmpresasErp()` - lógica de empresas
- `usePlanificacion()` - lógica de planificación
- `useProtocolos()` - lógica de protocolos

### Fase 4: Dividir App.tsx en Capas
**Meta**: Separar responsabilidades

- `useAppState()` - estado y datos globales
- `useAppLogic()` - funciones de lógica de negocio
- `App.tsx` - solo renderizar Layout + screen + routing

## Pasos Inmediatos (Hacer Ahora)

### 1. Crear PlanificacionScreen.tsx
Copiar contenido de `vista === 'planificacion'` → nuevo componente
Props que necesita: `planificacion`, `snapshot`, `sesion`, handlers

### 2. Crear ProtocolosScreen.tsx
Copiar contenido de `vista === 'protocolos'` → nuevo componente
Props que necesita: `protocolos`, `sesion`, handlers

### 3. Crear EmpresasErpScreen.tsx
Copiar contenido de `vista === 'empresas-erp'` → nuevo componente
Props que necesita: `snapshot`, `sesion`, handlers

### 4. Actualizar App.tsx Mínimamente
Reemplazar condicionales de vistas por renderizado de screens

## Beneficios de Esta Estrategia

✓ **Bajo riesgo**: Cambios incrementales y testables
✓ **Funcionabilidad**: App sigue funcionando en cada paso
✓ **Escalabilidad**: Fácil de agregar más pantallas
✓ **Mantenibilidad**: Cada pantalla ~300-400 líneas máximo
✓ **Reutilización**: Componentes comunes identificados
✓ **Testing**: Cada screen se puede testear aislada

## Notas Importantes

- NO cambiar lógica, solo estructura
- App.tsx mantiene TODO el estado mientras se refactoriza
- Cada screen es un "presentational component"
- Los handlers pasan como props desde App.tsx
