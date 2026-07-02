# Registro de Cambios

Todos los cambios notables de Timer Keeper se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/spec/v2.0.0.html).

## [4.0.0] - 2026-07-01

### Cambiado
- **Reescritura completa**: reconstruida desde una extensión CEP de JavaScript vanilla a una base de código modular con React 19 + TypeScript + Vite, siguiendo la misma arquitectura que Layers Pane Plus v4.
- **Rebranding a "Timer Keeper"**: la extensión ya no se llama "AE TimerKeeper" — nuevo nombre visible, nuevo ID de extensión/bundle (`com.donyaep.TimerKeeper`), nueva carpeta de panel. Las instalaciones previas (`com.dony.aetimerkeeper`) deben eliminarse manualmente; el tiempo ya rastreado se conserva automáticamente (ver Datos abajo).
- **Nuevo diseño monocromático "de instrumento"**: paleta estrictamente en escala de grises, Google Sans Flex en todo el panel con numerales tabulares en el display del temporizador, iconos Material Symbols Outlined — sin acentos de color; los estados se comunican por luminancia y motion, no por color.
- **Dashboard rediseñado**: el gráfico circular de colores fue reemplazado por una distribución de barras horizontales monocromáticas (solo por longitud, sin colores por proyecto), junto con stat cards y un alternador Top 5 / Todos.
- Piso mínimo elevado a **After Effects 2022 (22.0) / CEP 11**, requerido por el stack de UI moderno.
- Fuentes e iconos empaquetados localmente (sin CDN de Google Fonts) — el panel ahora funciona completamente offline.

### Corregido
- **Crash del alternador de formato de tiempo**: `toggleTimeFormat()` referenciaba una variable inexistente y rompía el display en tiempo de ejecución — reescrito con una única fuente de verdad.
- **Estadística falsa de "Hoy"**: el valor "Today" del Dashboard era un placeholder hardcodeado (`totalSeconds * 0.3`). Ahora está respaldado por tracking diario real (esquema de datos v2), acumulado mientras trabajas y reiniciado a medianoche.
- **Ejecución duplicada del menú flyout**: el handler del menú flyout se registraba dos veces, causando que cada acción del menú se ejecutara dos veces.
- **Handler de cierre de toast duplicado**: el botón de cierre del toast tenía dos listeners de clic adjuntos.
- **Tipo de toast incorrecto al eliminar**: eliminar un proyecto mostraba un toast estilo `error` para una acción exitosa.
- Eliminado código muerto (un contador de días permanentemente oculto).
- Unificado `formatTime` en una sola implementación TypeScript testeada (antes duplicada entre el panel y el host de ExtendScript, con riesgo de divergencia).
- Reemplazadas las llamadas `evalScript` encadenadas por tick (hasta 4 por sondeo) por una única llamada `getSnapshot()` al host, eliminando un patrón de callbacks propenso a condiciones de carrera.

### Datos
- Nuevo esquema en disco (v2) que agrega buckets reales de tiempo por proyecto y por día. Los archivos de datos v1 (`{Projects:[...]}`) y legacy (`{path: seconds}`) existentes se migran automáticamente en la primera carga, con una copia de seguridad `timerData.v1.backup.json` escrita antes del primer guardado v2. La ubicación del archivo de datos no cambia (`Documents/Adobe/TimerData/`).

## [3.0.0] - 2025-04-07

### Añadido
- **Reconstrucción completa como Extensión CEP de Adobe**, reemplazando el panel ScriptUI de ExtendScript por un panel HTML/JS/CSS persistente.
- **Panel de Análisis**: gráfico circular de distribución de tiempo, vista de proyectos principales con indicadores de progreso, alternador entre proyectos principales y todos.
- Navegación basada en pestañas entre Temporizador y Dashboard.
- Sistema de notificaciones toast para retroalimentación al usuario.
- Búsqueda/filtrado de proyectos en tiempo real.
- Detección de proyectos sin guardar y en conversión de versión, con pausa preventiva.

### Cambiado
- Mejorado el diseño visual con mejor espaciado, tipografía y esquema de colores.
- Diseño responsive que se adapta a distintos tamaños de panel.

## [2.1.0] - 2025-02-14

### Cambiado
- El JSON de datos del temporizador se movió del Escritorio a `Documents/Adobe/TimerData` (los archivos existentes del Escritorio se migran automáticamente).
- Rediseñado el panel de Ayuda: encabezado con versión, mejor organización de secciones, y un panel "Contact Me" con enlace copiable.

### Corregido
- El texto de ayuda ahora recomienda pausar manualmente el temporizador antes de cambiar o iniciar un nuevo proyecto.

## [2.0.0] - 2024

### Añadido
- Disposición de tres paneles (encabezado, principal, pie) con área de mensajes de estado persistente.
- Validación de proyectos y mejor manejo del cambio entre proyectos.
- Tooltips en todos los elementos principales de la UI.

## [1.1.0] - 2024

### Añadido
- Botón **Refrescar** para recargar manualmente los datos del temporizador desde disco.
- Doble clic para abrir un proyecto desde la lista de Proyectos Recientes.
- Guardado mediante archivo temporal + renombrado para reducir el riesgo de corrupción de datos.

### Corregido
- El script ya no se congela al agregar proyectos no almacenados previamente.
- Protecciones contra diálogos modales para evitar conflictos con la ejecución concurrente del script.

## [1.0.0] - 2023

### Añadido
- Versión inicial: iniciar/pausar/reiniciar temporizador por proyecto, lista de proyectos recientes con almacenamiento persistente, monitoreo automático de cambio de proyecto, y un panel de ayuda integrado.
