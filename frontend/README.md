# GP SELECT — frontend, fases 2 y 3

React, TypeScript y Vite, separado del backend .NET. HOME conserva las tres escenas aprobadas de fase 2 y añade servicios, preview de vehículos, cierre europeo y footer. La preview de inventario tiene estructura provisional: falta el mockup «Premium vehicles» para cerrar su validación visual. Las demás rutas muestran una pantalla informativa de alcance; no son catálogo, administración ni contacto funcionales.

## Ejecutar

Requiere Node.js 22.12+ o 24.

```powershell
cd frontend
npm ci
npm run dev
```

```powershell
npm run lint
npm run typecheck
npm run build
npm run preview
```

El backend no es necesario para revisar las escenas. El proxy de desarrollo `/api` apunta a `http://localhost:5000`; debe ajustarse al puerto real cuando se integre el inventario. En producción, servir frontend y API bajo el mismo origen. El servidor de estáticos deberá resolver las rutas del frontend a `index.html`, sin interceptar `/api`.

## Dónde cambiar cada cosa

- `src/styles/tokens.css`: familias provisionales, escalas, pesos, tracking, colores, espaciados, radios y movimiento.
- `src/i18n/es.ts` y `en.ts`: contenido visible y accesible. Español inicial; elección persistente en `gp-select.locale.v1`.
- `src/assets/sceneAssets.ts`: manifiesto de imágenes, rutas y configuración de recursos temporales.
- `public/assets/temp/`: placeholders estructurales, sin imágenes extraídas de mockups.
- `src/sections/`: HeroScene, PerformanceScene (tipografía oscura), VehicleScene (BMW M3 cenital).
- `src/sections/ServicesSection.tsx`, `InventoryPreview.tsx` y `EuropeSection.tsx`: continuación de HOME. Sus estilos y diccionarios se mantienen separados por sección.
- `src/components/Footer.tsx`: footer de HOME con navegación y contexto de consulta.
- `src/assets/servicesAssets.ts`, `inventoryAssets.ts` y `europeAssets.ts`: slots sustituibles de las secciones nuevas.
- `src/services/inventoryPreview.ts`: ejemplos identificados y adaptador puro del DTO público existente. Sin llamadas a la API.
- `src/hooks/useGsapScene.ts`: timelines reversibles GSAP/ScrollTrigger y reduced motion.
- `src/hooks/useEuropeScene.ts`: timeline europea aislada, sin alterar el hook aprobado de fase 2.
- `src/components/ScrollScene.tsx`: sección estable y contenedor fijado.
- `src/lib/qualification.ts` y `src/types/qualification.ts`: contexto futuro del cuestionario; no envía ni almacena datos personales.

Los PNG originales son exclusivamente referencias externas al frontend: no se importan, sirven ni animan como fondos.

Consulta [las decisiones de fase 2](docs/PHASE-2.md), [su validación original](docs/VALIDACION.md) y [el estado y evidencias de fase 3](docs/PHASE-3.md). No se ha iniciado fase 4 ni modificado el backend.
