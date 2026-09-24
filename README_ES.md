# Timer Keeper por dony.

[![English](https://img.shields.io/badge/Language-English-blue.svg)](README.md)
[![Español](https://img.shields.io/badge/Idioma-Español-red.svg)](README_ES.md)
[![Versión](https://img.shields.io/badge/versión-4.1.0-white.svg)](CHANGELOG_ES.md)
[![After Effects](https://img.shields.io/badge/After%20Effects-2022%2B-9999ff.svg)](#compatibilidad)
[![CEP](https://img.shields.io/badge/CEP-11-555.svg)](#compatibilidad)
[![Stack](https://img.shields.io/badge/React%2019%20·%20TypeScript%20·%20Vite-1e1e1e.svg)](#stack-tecnológico)
[![Licencia](https://img.shields.io/badge/licencia-ver%20LICENSE-lightgrey.svg)](LICENSE)

> **[Read in English](README.md) | Leer en Español**

## Descripción
Timer Keeper es una extensión para Adobe After Effects que rastrea el tiempo que dedicas a cada proyecto. Detecta qué proyecto está abierto, mantiene un registro de tiempo acumulado por proyecto (y por día), y te ofrece un dashboard monocromático para ver realmente en qué se fueron tus horas — sin cronómetro manual, sin hojas de cálculo.

Antes distribuida como "AE TimerKeeper", la extensión fue reconstruida desde cero como **Timer Keeper**.

## Versión Actual
**v4.1.0** - Más ligera para After Effects: guardar y comprobar el proyecto abierto le piden mucho menos trabajo, la suspensión ya no cuenta como tiempo trabajado y la descarga pesa mucho menos. Ver [CHANGELOG_ES.md](CHANGELOG_ES.md).

## Novedades en v4.1.0
- **Más ligera para After Effects:** el panel escribe tu tiempo por sí mismo cada 30 s en vez de pedírselo a After Effects cada 5 s, y comprueba el proyecto abierto cada 5 s mientras cuenta (10 s en pausa) en vez de cada 2 s.
- **Datos más seguros:** cada guardado conserva la versión anterior como `timerData.bak.json` y la carga recurre a ella si el archivo principal falta o está corrupto.
- **La suspensión ya no cuenta como trabajo:** los huecos de más de 5 minutos se descartan, con aviso.
- **Dos After Effects abiertos** registrando a la vez ya no se pisan el tiempo.
- **Descarga mucho más pequeña:** la fuente de iconos incluye solo los que usa el panel (unos 7 KB en vez de 4 MB).

## Novedades en v4.0.1
- **El panel carga en macOS:** en After Effects 2022 ya no abre vacío.
- **Los clics funcionan en macOS:** los botones, las pestañas y la lista de proyectos responden en After Effects 2022.

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

### Para usuarios: instalación rápida (recomendada)
Cada [release](https://github.com/dony-aep/timer-keeper/releases/latest) incluye un `.zxp` firmado. No necesita modo debug ni claves de registro.

1. Descarga e instala el [ZXP/UXP Installer de aescripts + aeplugins](https://aescripts.com/learn/zxp-installer/), gratuito, para Windows y macOS.
2. Descarga `timer-keeper-vX.Y.Z.zxp` de la última release.
3. Cierra After Effects y abre el `.zxp` en el instalador: arrástralo a la ventana o usa **File > Open**.
4. Abre After Effects y ve a **Ventana > Extensiones > Timer Keeper**.

> Si el instalador dice que no encontró ninguna aplicación compatible y marca After Effects con «Action required», es porque el instalador de Adobe necesita la app de escritorio de Creative Cloud abierta y con la sesión iniciada. Puedes instalar sin ella: pulsa **Install Anyway**. Si eso falla, abre los ajustes del instalador (icono del engranaje), activa **Install for current user only** e instala de nuevo.

### Para usuarios: instalación manual (zip)
1. Localiza la carpeta de extensiones CEP de After Effects:
   - **Windows:** `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions` (o, por usuario: `%APPDATA%\Adobe\CEP\extensions`)
   - **macOS:** `/Library/Application Support/Adobe/CEP/extensions` (o, por usuario: `~/Library/Application Support/Adobe/CEP/extensions`)
2. Descomprime el zip de la release y copia en ese directorio la carpeta `com.donyaep.TimerKeeper` que viene dentro.
3. Inicia After Effects y abre la extensión desde **Ventana > Extensiones > Timer Keeper**.

> Si tenías instalada "AE TimerKeeper" (`com.dony.aetimerkeeper`), elimínala de ambas carpetas de extensiones CEP — la nueva extensión usa un ID distinto y se trata como una instalación separada. Tu tiempo registrado no se pierde: vive en `Documents/Adobe/TimerData/` y se migra automáticamente en la primera carga.

> Las builds de desarrollo sin firmar requieren activar el modo debug de CEP una vez. En Windows, haz doble clic en `Add Keys.reg`, que viene en el zip de la release, o ejecuta:
> ```
> reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
> ```
> En macOS, desde Terminal:
> ```
> defaults write com.adobe.CSXS.11 PlayerDebugMode 1 && killall cfprefsd
> ```

### Para desarrolladores (compilar desde el código fuente)
Requiere **Node.js 20.19+ o 22.12+** (requisito de Vite 8).

```bash
npm install        # instalar dependencias
npm run dev        # servidor de desarrollo de Vite (vista previa en navegador)
npm run build      # chequeo de tipos + build de producción a dist/
npm run deploy     # build + copia a %APPDATA%\Adobe\CEP\extensions (instalación local)
npm run package    # build + zip de dist/ en releases/ para distribución
npm run icons      # regenera la fuente de iconos tras añadir uno a iconNames.ts
npm run sign       # build + .zxp firmado en releases/ (requiere ZXPSignCmd y un certificado)
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

> Probada en Windows 11 con After Effects 2026 y en macOS 12 Monterey con After Effects 2022.

## Características Principales
- **Seguimiento en tiempo real:** inicia/pausa el timer para el proyecto actual con un clic; el tiempo se guarda mientras corre (cada 30 s, y cada vez que pausas, cambias de proyecto o cierras el panel).
- **Detección automática de proyecto:** pausa el proyecto anterior y auto-inicia el recién abierto si ya tiene tiempo registrado; pausa preventiva para proyectos sin guardar o en conversión de versión.
- **Lista de proyectos:** búsqueda por nombre, doble clic para abrir un proyecto (e iniciar su cronometraje), eliminar un proyecto y sus datos, actualizar desde disco.
- **Reiniciar:** borra el tiempo acumulado del proyecto seleccionado (con confirmación).
- **Alternador de formato de tiempo:** cambia entre `HH:MM:SS` y un formato de duración descriptivo.
- **Dashboard:** tiempo total registrado, tiempo de hoy (real, por día calendario), número de proyectos, y una distribución en dona o en barras horizontales con alternador Top 5 / Todos. Cada proyecto puede tener su propio color.
- **Modal de ayuda:** guía de uso, atajo "Abrir Ubicación de Datos", y enlace de contacto/documentación.
- **Notificaciones toast** para advertencias (p. ej. "pausa antes de reiniciar") y confirmaciones.
- **Notificaciones de actualización:** consulta GitHub Releases (como máximo una vez al día) y muestra un enlace en el footer cuando hay una versión más nueva; el chequeo manual "Check for Updates" vive en el menú flyout. Totalmente silencioso sin conexión.
- **Menú flyout:** refrescar, buscar actualizaciones y abrir documentación, directamente desde el menú del panel.

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
   - Haz clic en el cuadradito de un proyecto en la leyenda de la dona para elegir su color, o en **Automatic** para volver al gris.
5. **Ayuda:** haz clic en el icono de ayuda en el pie para ver una guía de uso, acceso rápido a la carpeta de tu archivo de datos, y enlaces de soporte/documentación.
6. **Menú flyout:** abre el menú del panel (arriba a la derecha) para actualizar la lista de proyectos o abrir la documentación en línea.

## Datos
Los datos del temporizador se guardan como JSON en `Documents/Adobe/TimerData/timerData.json`, escrito por el panel a través de un archivo temporal, conservando la versión anterior como `timerData.bak.json`. Los formatos antiguos de versiones anteriores se detectan y migran automáticamente la primera vez que abres la extensión, con una copia de respaldo escrita antes de la migración.

## Historial de Versiones
Para el historial detallado de versiones y registro de cambios, consulta [CHANGELOG_ES.md](CHANGELOG_ES.md).

## Soporte
Si necesitas ayuda o quieres proporcionar retroalimentación, puedes contactarme aquí:
[https://donyaep.vercel.app/](https://donyaep.vercel.app/)

¡Disfruta la extensión y mantente al tanto del tiempo de tus proyectos!
