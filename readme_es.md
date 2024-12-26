# Timer Script por dony.

## Descripción
Timer Script es un potente script para Adobe After Effects diseñado para ayudar a los usuarios a rastrear y gestionar el tiempo dedicado a proyectos individuales. Ya sea que estés trabajando en múltiples composiciones o manejando varios proyectos simultáneamente, este script ofrece una interfaz intuitiva para monitorear tu flujo de trabajo de manera eficiente. Al mantener un registro detallado de tus proyectos activos, Timer Script mejora la productividad y asegura que cumplas con tus plazos.

## Versión Actual
**v2.0** - Rediseño completo de la interfaz de usuario con funcionalidad mejorada, manejo robusto de errores y sistema integral de retroalimentación al usuario.

## Instalación
1. **Ubica la Carpeta de ScriptUI Panels de After Effects:**
   ```
   C:\Program Files\Adobe\Adobe After Effects [Versión]\Support Files\Scripts\ScriptUI Panels
   ```
2. **Coloca el Archivo del Script:**
   - Copia el archivo `TimerScript.jsx` en la carpeta `ScriptUI Panels`.
3. **Accede al Script en After Effects:**
   - Abre Adobe After Effects.
   - Navega a `Window > TimerScript.jsx` para lanzar el panel.

## Funciones Principales
- **Iniciar/Pausar Temporizador:**
  - Inicia o pausa fácilmente el temporizador para el proyecto actual con un solo clic.
  
- **Reiniciar Temporizador:**
  - Reinicia el temporizador para un proyecto seleccionado para rastrear el tiempo desde cero.
  
- **Gestión de Proyectos Recientes:**
  - Visualiza una lista de proyectos recientes con temporizadores activos.
  - Elimina proyectos seleccionados de la lista de recientes.
  
- **Refrescar Datos:**
  - Recarga manualmente los datos del temporizador desde el archivo JSON para asegurar que la información más reciente esté mostrada.
  - Reinicia automáticamente la visualización del temporizador al refrescar para prevenir conflictos con datos de proyectos anteriores.
  
- **Abrir Proyecto al Hacer Doble Clic:**
  - Abre rápidamente un proyecto haciendo doble clic en él en la lista de Proyectos Recientes.
  
- **Monitoreo Automático:**
  - Pausa automáticamente el temporizador al cambiar entre proyectos.
  - Inicia automáticamente el temporizador para proyectos recién abiertos.
  
- **Almacenamiento Persistente de Datos:**
  - Guarda los datos del temporizador en un archivo JSON en tu escritorio, asegurando que tu progreso se mantenga entre sesiones.
  
- **Interfaz Amigable para el Usuario:**
  - UI limpia e intuitiva con botones para todas las funciones principales.
  - Muestra el tiempo transcurrido en formato `HH:MM:SS`.
  
- **Ayuda y Documentación:**
  - Panel de ayuda incorporado que proporciona instrucciones detalladas de uso y guía.

## Uso
1. **Abre Adobe After Effects.**
2. **Lanza el Panel de Timer:**
   - Ve a `Window > TimerScript`.
3. **Inicia el Temporizador:**
   - Haz clic en el botón **Start** para comenzar a rastrear el tiempo para el proyecto actual.
   - Un mensaje de estado confirmará que el temporizador ha comenzado junto con el tiempo inicial.
4. **Pausa el Temporizador:**
   - Haz clic en el botón **Pause** para pausar el temporizador. Un mensaje de estado mostrará el tiempo pausado.
5. **Reinicia el Temporizador:**
   - Selecciona un proyecto de la lista de **Recent Projects**.
   - Haz clic en el botón **Reset** para resetear su temporizador a `00:00:00`.
6. **Elimina un Proyecto:**
   - Selecciona un proyecto de la lista de **Recent Projects**.
   - Haz clic en el botón **Delete Selected** para removerlo de la lista.
7. **Refrescar Datos:**
   - Haz clic en el botón **Refresh Data** para recargar manualmente los datos del temporizador desde el archivo JSON.
   - Esta acción reiniciará la visualización del temporizador para asegurar que no queden datos residuales.
8. **Abrir Proyecto al Hacer Doble Clic:**
   - Haz doble clic en cualquier proyecto listado bajo **Recent Projects** para abrirlo directamente en After Effects.
9. **Accede a la Ayuda:**
   - Haz clic en el botón **Help** para ver instrucciones detalladas e información sobre el script.
10. **Mensajes de Estado:**
    - El área de estado en la parte inferior del panel mostrará mensajes temporales sobre las operaciones actuales.
11. **Tooltips:**
    - Pasa el cursor sobre cualquier botón o elemento de la interfaz para ver una descripción detallada de su función.

## Nota
Si dejas el script abierto al cerrar Adobe After Effects y luego vuelves a abrir After Effects con el script aún abierto, **podría no cargar** la información guardada previamente correctamente. Para asegurar que todos los datos se carguen adecuadamente, puedes hacer clic en el botón **Refresh** para recargar los datos guardados del temporizador, o alternativamente, cerrar y volver a abrir el panel del script después de iniciar Adobe After Effects.

Al cambiar entre proyectos, se recomienda pausar el temporizador primero. Si intentas abrir otro proyecto haciendo doble clic en él en la lista de Proyectos Recientes mientras el temporizador está corriendo, el script mostrará un mensaje de advertencia diciendo "Por favor pausa el temporizador del proyecto actual antes de cambiar a otro proyecto" junto con detalles sobre el nombre del proyecto actual y el tiempo transcurrido. Esta advertencia ayuda a prevenir conflictos de temporización. La misma precaución aplica cuando se abren proyectos a través de Archivo -> Abrir Proyecto... o desde la ventana de Inicio (la ventana predeterminada que muestra los proyectos recientemente abiertos de After Effects). Pausar el temporizador asegura un seguimiento preciso del tiempo entre cambios de proyecto.

## Historial de Versiones

### v2.0 (Rediseño Mayor de UI y Arquitectura)
- **Rediseño Completo de la UI:**
  - Implementada nueva disposición de tres paneles (encabezado, principal, pie)
  - Añadido sistema integral de mensajes de estado
  - Mejorada la jerarquía visual y organización de componentes
  - Optimizado el espaciado y alineación en toda la interfaz
  - Añadida área de visualización persistente para retroalimentación del usuario
  - Integrados nuevos elementos de marca y firma visual

- **Gestión Mejorada de Proyectos:**
  - Añadido sistema robusto de validación de proyectos
  - Mejorado el manejo y validación de rutas de proyecto
  - Mejorado el mecanismo de cambio entre proyectos
  - Añadida retroalimentación visual para la selección de proyectos
  - Mejor manejo de nombres de proyecto con caracteres especiales

- **Funciones Avanzadas del Temporizador:**
  - Implementada gestión integral del estado del temporizador
  - Añadido manejo robusto de errores para operaciones del temporizador
  - Mejorada la validación de datos y cálculos del temporizador
  - Mejorada la sincronización entre UI y estado del temporizador
  - Añadida retroalimentación detallada del seguimiento de tiempo

- **Experiencia de Usuario Mejorada:**
  - Añadidos tooltips para todos los elementos principales de la UI
  - Mejorado el sistema de ayuda con mejor organización
  - Implementados mensajes de estado temporales
  - Añadida retroalimentación detallada para todas las acciones del usuario
  - Mejorada la interacción y retroalimentación de la lista de proyectos

- **Mejoras Técnicas:**
  - Reestructurada la arquitectura del código para mejor mantenibilidad
  - Mejorado el manejo de errores en todo el script
  - Mejorada la validación y sanitización de datos
  - Optimizada la gestión de memoria
  - Mejoradas las operaciones de archivo para persistencia de datos
  - Mejor manejo de diálogos modales y estados de la UI

### v1.1 (Funcionalidad Mejorada)
- **Añadida Funcionalidad de Refrescar Datos:**
  - Introducido un botón **Refrescar Datos** para recargar manualmente los datos del temporizador desde el archivo JSON.
  - Asegura que la información más reciente del temporizador se muestre con precisión en el panel de Proyectos Recientes.
  
- **Abrir Proyecto al Hacer Doble Clic:**
  - Habilitada la apertura directa de un proyecto desde la lista de Proyectos Recientes haciendo doble clic en él.
  
- **Mejoras en el Manejo de Errores:**
  - **Prevención de Congelamientos:**
    - Se mejoró la robustez del script para evitar que se congele al agregar nuevos proyectos que no estaban previamente almacenados.
    - Se implementaron verificaciones adicionales para manejar correctamente la carga de datos y la actualización de la UI.
  
  - **Gestión de Diálogos Modales:**
    - Se implementaron banderas para detectar y gestionar diálogos modales, asegurando que las alertas y confirmaciones no interfieran con la ejecución del script.
    - Esto previene errores comunes en After Effects relacionados con la ejecución de scripts mientras se muestran diálogos modales.
  
- **Reinicialización de la Visualización del Temporizador:**
  - **Reset Timer Display:**
    - Al refrescar los datos, la visualización del temporizador se reinicia automáticamente a `00:00:00`.
    - Esto elimina cualquier referencia residual a proyectos anteriores y garantiza que la UI refleje con precisión el estado actual de los datos.
  
- **Optimización del Mecanismo de Guardado de Datos:**
  - **Guardado Seguro de Datos:**
    - Se optimizó el proceso de guardado de datos para escribir primero en un archivo temporal antes de renombrarlo, reduciendo el riesgo de corrupción de datos.
    - Esta mejora asegura que la información se guarde de manera más confiable.

### v1.0 (Versión Inicial)
- Añadidas funcionalidades esenciales del temporizador: iniciar, pausar y reiniciar.
- Implementado seguimiento de proyectos recientes con almacenamiento persistente.
- Diseñada una interfaz amigable para el usuario con botones esenciales.
- Introducido monitoreo automático de proyectos para manejar el estado del temporizador basado en proyectos activos.
- Integrado un panel de ayuda para la guía y soporte del usuario.

## Soporte
Si necesitas ayuda o deseas proporcionar feedback, puedes contactarme aquí:
[https://linktr.ee/Dony.ae](https://linktr.ee/Dony.ae)

¡Disfruta usando Timer Script y mejora tu flujo de trabajo en After Effects! :>