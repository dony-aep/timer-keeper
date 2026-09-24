# Registro de Cambios

Todos los cambios notables de Timer Keeper se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto se adhiere a [Versionado Semántico](https://semver.org/lang/es/spec/v2.0.0.html).

## [4.2.0] - 2026-09-23

### Añadido
- **Pausa automática por inactividad**: si te alejas del ordenador con el timer en marcha, ahora puede pausarse solo tras 5, 10, 15 o 30 minutos sin teclado ni ratón, descontar ese tiempo del proyecto y reanudarse cuando vuelves al mismo proyecto. El plazo se elige en el menú del panel, en **Auto-pause when idle**; viene desactivada. Una pausa manual nunca se reanuda sola.
- **Colores por proyecto**: en el Dashboard, haz clic en el cuadradito de un proyecto en la leyenda de la dona para darle un color, entre diez predefinidos o cualquiera con el selector (área de color, barra de tono y campo hex). El color se ve en la dona y en las barras y se guarda con tus datos; **Automatic** vuelve al gris por defecto.

### Cambiado
- **Las notificaciones duran más**: ahora se quedan en pantalla al menos 8 segundos (hasta 20 si el mensaje es largo) y no se cierran mientras el cursor está encima. Al sacar el cursor, la cuenta atrás empieza de nuevo, y la X las cierra al momento.

### Corregido
- **El formato de texto se salía del panel**: los tiempos largos como «1 hrs, 7 mins, 44 secs» se salían de la tarjeta del timer y quedaban debajo del botón de formato. Ahora el texto baja de línea entre unidades y cabe incluso con el panel en su ancho mínimo.
- **Las listas del Dashboard se leían mal en paneles estrechos**: cuando las tarjetas de resumen se apilaban, la leyenda de la dona quedaba reducida a una fila y el gráfico de barras alargaba el Dashboard con cada proyecto registrado. Ahora las dos muestran al menos unos cinco proyectos y se desplazan dentro de su propia zona.
- **Se perdían cambios al cerrar el panel**: si otra ventana de After Effects había escrito el archivo de datos, al cerrar o recargar el panel se fusionaba bien su tiempo y, un instante después, se guardaban encima los datos antiguos. Ahora el panel se queda con el resultado de la fusión y el tiempo de la otra ventana se conserva.

## [4.1.0] - 2026-09-16

### Cambiado
- **Autoguardado más ligero**: guardar tu tiempo ya no se ejecuta dentro de After Effects. El panel escribe el archivo por sí mismo cada 30 segundos y cada vez que pausas, cambias de proyecto o cierras el panel, en vez de pedirle a After Effects que lo haga cada 5 segundos.
- **Menos peticiones a After Effects**: el panel comprueba qué proyecto está abierto cada 5 segundos mientras cuenta y cada 10 en pausa, en vez de cada 2, y lo comprueba al momento cuando haces clic o pasas el ratón por el panel.
- **Menos trabajo mientras el timer cuenta**: la lista de proyectos y el gráfico del Dashboard se refrescan cada vez que se guarda tu tiempo (cada 30 segundos) en vez de cada segundo. El reloj, la fila del proyecto activo y las cifras de Total y Hoy siguen actualizándose cada segundo.
- **Indicador de marcha más tranquilo**: los dos puntos del reloj se atenúan un segundo sí y otro no en vez de pulsar sin parar, así el panel deja de redibujarse continuamente mientras el timer cuenta.
- **Descarga mucho más pequeña**: la fuente de iconos incluye solo los 23 iconos que usa el panel (unos 7 KB en vez de 4 MB), así que el zip de la release pesa mucho menos y el panel tiene menos que cargar al abrirse.

### Corregido
- **El archivo de datos podía perderse al fallar un guardado**: si reemplazar el archivo fallaba a mitad, podían borrarse tanto la copia antigua como la nueva. Ahora cada guardado conserva la versión anterior como `timerData.bak.json`, la restaura si algo falla y la carga la usa como respaldo.
- **La detección de proyectos podía pararse toda la sesión**: si After Effects no respondía a una de las comprobaciones del panel, este dejaba de notar los cambios de proyecto hasta recargarlo. Ahora cada comprobación se abandona a los 60 segundos y se vuelve a intentar.
- **Dos After Effects abiertos se pisaban el tiempo**: cuando dos instancias de After Effects registran tiempo a la vez (por ejemplo, la versión estable y una beta), cada guardado suma lo que escribió la otra en vez de reemplazarlo.
- **La suspensión contaba como trabajo**: si el ordenador se suspendía con el timer en marcha, al despertar se sumaba al proyecto todo el tiempo suspendido. Ahora no se cuentan los huecos de más de 5 minutos entre actualizaciones del timer, y el panel avisa cuando descarta uno.

### Seguridad
- **Sin puerto de depuración en las releases**: el zip de la release ya no incluye el archivo `.debug`, que abría un puerto de Chrome DevTools (8090) en cada instalación con el modo debug activado.

## [4.0.1] - 2026-09-10

### Cambiado
- **Instalación más sencilla**: el zip de la release ahora trae dentro la carpeta `com.donyaep.TimerKeeper`, así que instalar es copiar esa carpeta en el directorio de extensiones CEP.
- **Modo debug en Windows**: el zip de la release incluye `Add Keys.reg`, que activa `PlayerDebugMode` en CSXS 5 a 22 con un doble clic.

### Corregido
- **Panel vacío en After Effects 2022 para macOS**: el panel abría vacío porque su código se cargaba como módulo ES, y el motor CEP 11 de macOS no lo ejecuta desde la carpeta de la extensión. Ahora se carga como script clásico.
- **Botones y pestañas sin respuesta en macOS**: en After Effects 2022 para macOS los clics llegaban al panel, pero ningún botón, pestaña ni elemento de la lista reaccionaba, porque ese motor no emite eventos de puntero. El panel ahora los genera a partir de los clics del ratón, y no interviene donde el motor ya los emite (comprobado en After Effects 2026 para Windows).

## [4.0.0] - 2026-07-01

### Añadido
- **Notificaciones de actualización**: el panel consulta la API de GitHub Releases (automáticamente como máximo una vez al día, o bajo demanda con la nueva acción "Check for Updates" del menú flyout) y muestra un enlace "Update vX.Y.Z" en el footer cuando hay una versión más nueva publicada. Falla silenciosamente sin conexión — el panel nunca depende de la red.

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
