# Timer Keeper por dony.

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README.md)
[![Español](https://img.shields.io/badge/Idioma-Español-red.svg)](README_ES.md)
[![Versión](https://img.shields.io/badge/versión-4.0.0-white.svg)](CHANGELOG_ES.md)
[![After Effects](https://img.shields.io/badge/After%20Effects-2022%2B-9999ff.svg)](#compatibilidad)
[![CEP](https://img.shields.io/badge/CEP-11-555.svg)](#compatibilidad)
[![Stack](https://img.shields.io/badge/React%2019%20·%20TypeScript%20·%20Vite-1e1e1e.svg)](#stack-tecnológico)
[![Licencia](https://img.shields.io/badge/licencia-ver%20LICENSE-lightgrey.svg)](LICENSE)

> **[Read in English](README.md) | Leer en Español**

## Descripción
Timer Keeper es una extensión para Adobe After Effects que rastrea el tiempo que dedicas a cada proyecto. Detecta qué proyecto está abierto, mantiene un registro de tiempo acumulado por proyecto (y por día), y te ofrece un dashboard monocromático para ver realmente en qué se fueron tus horas — sin cronómetro manual, sin hojas de cálculo.

Antes distribuida como "AE TimerKeeper", la extensión fue reconstruida desde cero como **Timer Keeper**.

## Versión Actual
**v4.0.0** - Reescritura completa: migrada a una arquitectura moderna y modular (React + TypeScript, compilada con Vite), un nuevo diseño monocromático "de instrumento", tracking diario real, y varios bugs de v3 corregidos. Ver [CHANGELOG_ES.md](CHANGELOG_ES.md).

## Novedades en v4.0.0
- **Reconstruida desde cero** sobre una base modular React + TypeScript (compilada con Vite), reemplazando el panel de un solo archivo — más fácil de mantener y ampliar.
- **Rebranding**: "AE TimerKeeper" ahora es **Timer Keeper**, con un nuevo ID de extensión y nombre de panel.
- **UI monocromática "de instrumento"**: sin acentos de color — el estado se muestra mediante icono, luminancia y motion sutil (los dos puntos del display pulsan mientras corre el timer, la tecla Start/Pause se anima).
- **Tracking real de "Hoy"**: el total diario del Dashboard ahora refleja el tiempo realmente registrado hoy (antes un placeholder hardcodeado), respaldado por un nuevo esquema de datos por día.
- **Dashboard rediseñado**: el gráfico circular de colores fue reemplazado por una distribución de barras horizontales monocromáticas, junto con stat cards y un alternador Top 5 / Todos.
- **Correcciones heredadas de v3**: el alternador de formato de tiempo ya no rompe el display, el menú flyout ya no ejecuta las acciones dos veces, las notificaciones toast ya no se disparan dos veces ni usan el estilo incorrecto, y el formateo de tiempo del host/panel se unificó en una sola implementación.
- **Totalmente offline**: fuentes (Google Sans Flex) e iconos (Material Symbols) empaquetados localmente — sin peticiones a CDN.
- **Compatibilidad actualizada:** ahora requiere After Effects 2022 (22.0) o superior.

## Instalación

### Para usuarios (extensión ya compilada)
1. Localiza la carpeta de extensiones CEP de After Effects:
   ```
   C:\Program Files (x86)\Common Files\Adobe\CEP\extensions
   ```
   (o, por usuario: `%APPDATA%\Adobe\CEP\extensions`)
2. Coloca la carpeta de la extensión compilada (`com.donyaep.TimerKeeper`) en esa carpeta.
3. Inicia After Effects y abre la extensión desde **Ventana > Extensiones > Timer Keeper**.

> Si tenías instalada "AE TimerKeeper" (`com.dony.aetimerkeeper`), elimínala de ambas carpetas de extensiones CEP — la nueva extensión usa un ID distinto y se trata como una instalación separada. Tu tiempo registrado no se pierde: vive en `Documents/Adobe/TimerData/` y se migra automáticamente en la primera carga.

> Las builds de desarrollo sin firmar requieren activar el modo debug de CEP una vez:
> ```
> reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
> ```

### Para desarrolladores (compilar desde el código fuente)
Requiere **Node.js 20.19+ o 22.12+** (requisito de Vite 8).

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo de Vite (vista previa en navegador)
npm run build      # chequeo de tipos + build de producción a dist/
npm run deploy     # build + copia a %APPDATA%\Adobe\CEP\extensions (instalación local)
npm run package    # build + zip de dist/ en releases/ para distribución
```

Tras `npm run deploy`, reinicia After Effects para cargar el panel actualizado.

## Stack Tecnológico
- UI en **React 19** + **TypeScript**, compilada con **Vite** (`build.target: chrome88`).
- **react-aria-components** para controles accesibles y navegables por teclado.
- **CSS Modules** + tokens de diseño (sin Tailwind), tema monocromático "de instrumento".
- Fuentes/iconos empaquetados localmente (Google Sans Flex + subset de Material Symbols Outlined) — offline, sin CDN.
- Lógica host en **ExtendScript** (`public/jsx/hostscript.jsx`, bajo el namespace `$.global.TimerKeeper`) conectada a la UI vía `CSInterface.evalScript`.

## Compatibilidad
| Requisito | Mínimo |
|---|---|
| After Effects | 2022 (22.0) |
| Runtime CEP | 11 (Chromium 88) |

> El piso se elevó a After Effects 22.0 para alinearse con el resto de la línea actual de extensiones y su stack de UI moderno.

## Características Principales
- **Seguimiento en tiempo real:** inicia/pausa el timer para el proyecto actual con un clic; el tiempo se guarda continuamente mientras corre (autoguardado cada 5 s, y al pausar/cerrar).
- **Detección automática de proyecto:** pausa el proyecto anterior y auto-inicia el recién abierto si ya tiene tiempo registrado; pausa preventiva para proyectos sin guardar o en conversión de versión.
- **Lista de proyectos:** búsqueda por nombre, doble clic para abrir un proyecto (e iniciar su cronometraje), eliminar un proyecto y sus datos, actualizar desde disco.
- **Reiniciar:** borra el tiempo acumulado del proyecto seleccionado (con confirmación).
- **Alternador de formato de tiempo:** cambia entre `HH:MM:SS` y un formato de duración descriptivo.
- **Dashboard:** tiempo total registrado, tiempo de hoy (real, por día calendario), número de proyectos, y una distribución de barras horizontales monocromáticas con alternador Top 5 / Todos.
- **Modal de ayuda:** guía de uso, atajo "Abrir Ubicación de Datos", y enlace de contacto/documentación.
- **Notificaciones toast** para advertencias (p. ej. "pausa antes de reiniciar") y confirmaciones.
- **Menú flyout:** actualizar y abrir documentación, directamente desde el menú del panel.

## Uso
1. Abre Adobe After Effects.
2. Ve a **Ventana > Extensiones > Timer Keeper**.
3. **Pestaña Timer:**
   - Haz clic en **Start** para comenzar a rastrear el proyecto actualmente abierto, **Pause** para detenerlo.
   - Selecciona un proyecto en la lista y haz clic en **Reset** para borrar su tiempo, o **Delete** para eliminarlo (ambos requieren pausar el timer primero).
   - Usa el campo de búsqueda para filtrar la lista de proyectos; haz doble clic (o presiona Enter) en un proyecto para abrirlo en After Effects e iniciar su cronometraje.
   - Haz clic en el icono de intercambio junto al display de tiempo para alternar entre `HH:MM:SS` y un formato descriptivo.
4. **Pestaña Dashboard:**
   - Revisa el tiempo total registrado, el tiempo de hoy, y el número de proyectos rastreados.
   - Alterna entre **Top 5** y **Todos** los proyectos en la vista de distribución.
5. **Ayuda:** haz clic en el icono de ayuda en el pie para ver una guía de uso, acceso rápido a la carpeta de tu archivo de datos, y enlaces de soporte/documentación.
6. **Menú flyout:** abre el menú del panel (arriba a la derecha) para actualizar la lista de proyectos o abrir la documentación en línea.

## Datos
Los datos del temporizador se guardan como JSON en `Documents/Adobe/TimerData/timerData.json`, escrito de forma atómica (archivo temporal + renombrado) por el host de ExtendScript. Los formatos antiguos de versiones anteriores se detectan y migran automáticamente la primera vez que abres la extensión, con una copia de respaldo escrita antes de la migración.

## Historial de Versiones
Para el historial detallado de versiones y registro de cambios, consulta [CHANGELOG_ES.md](CHANGELOG_ES.md).

## Soporte
Si necesitas ayuda o quieres proporcionar retroalimentación, puedes contactarme aquí:
[https://donyaep.vercel.app/](https://donyaep.vercel.app/)

¡Disfruta la extensión y mantente al tanto del tiempo de tus proyectos!
