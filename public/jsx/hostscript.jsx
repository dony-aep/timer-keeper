/**
 * Timer Keeper Extension
 * Host Script JSX File (namespaced host)
 * Estado: el host es SIN estado salvo las rutas de archivo.
 */

// =========================================================================
// json2.js (JSON polyfill)
// https://github.com/douglascrockford/JSON-js/blob/master/json2.js
// Public Domain.
// =========================================================================
if (typeof JSON !== 'object') {
    JSON = {};
}

(function () {
    'use strict';

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10
            ? '0' + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== 'function') {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear() + '-' +
                        f(this.getUTCMonth() + 1) + '-' +
                        f(this.getUTCDate()) + 'T' +
                        f(this.getUTCHours()) + ':' +
                        f(this.getUTCMinutes()) + ':' +
                        f(this.getUTCSeconds()) + 'Z'
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? '"' + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === 'string'
                    ? c
                    : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            }) + '"'
            : '"' + string + '"';
    }


    function str(key, holder) {
        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        if (value && typeof value === 'object' &&
                typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

        if (typeof rep === 'function') {
            value = rep.call(holder, key, value);
        }

        switch (typeof value) {
        case 'string':
            return quote(value);

        case 'number':
            return isFinite(value)
                ? String(value)
                : 'null';

        case 'boolean':
        case 'null':
            return String(value);

        case 'object':
            if (!value) {
                return 'null';
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === '[object Array]') {
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || 'null';
                }
                v = partial.length === 0
                    ? '[]'
                    : gap
                        ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']'
                        : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            if (rep && typeof rep === 'object') {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === 'string') {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ': '
                                    : ':'
                            ) + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ': '
                                    : ':'
                            ) + v);
                        }
                    }
                }
            }
            v = partial.length === 0
                ? '{}'
                : gap
                    ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}'
                    : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        // ExtendScript specific: Handle File and Folder objects gracefully
        case 'object': // ExtendScript File/Folder might report as 'object'
             if (value instanceof File || value instanceof Folder) {
                 return quote(value.fsName); // Stringify path for File/Folder
             }
             // Fall through for other objects
        default: // Add default case to handle potential unknown types
              return undefined; // Or return 'null' or quote('unsupported')
        }
    }

    if (typeof JSON.stringify !== 'function') {
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        };
        JSON.stringify = function (value, replacer, space) {
            var i;
            gap = '';
            indent = '';
            if (typeof space === 'number') {
                for (i = 0; i < space; i += 1) {
                    indent += ' ';
                }
            } else if (typeof space === 'string') {
                indent = space;
            }
            rep = replacer;
            if (replacer && typeof replacer !== 'function' &&
                    (typeof replacer !== 'object' ||
                    typeof replacer.length !== 'number')) {
                throw new Error('JSON.stringify');
            }
            return str('', {'': value});
        };
    }

    if (typeof JSON.parse !== 'function') {
        JSON.parse = function (text, reviver) {
            var j;
            function walk(holder, key) {
                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === 'object') {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }
            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return '\\u' +
                            ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }
            if (
                rx_one.test(
                    text
                        .replace(rx_two, '@')
                        .replace(rx_three, ']')
                        .replace(rx_four, '')
                )
            ) {
                j = eval('(' + text + ')');
                return typeof reviver === 'function'
                    ? walk({'': j}, '')
                    : j;
            }
            throw new SyntaxError('JSON.parse');
        };
    }
}());
// ========= END of json2.js Polyfill =========


// =========================================================================
// TimerKeeper namespace (IIFE). Todo el host vive aqui dentro.
// El host es sin estado salvo las rutas de archivo de datos.
// =========================================================================
$.global.TimerKeeper = (function () {
    var api = {};

    // --- Rutas de datos (se resuelven una sola vez al evaluar el IIFE) ---
    // NO cambiar esta ruta: los usuarios de v3 tienen sus datos ahi.
    var documentsFolder = Folder.myDocuments;
    var dataFolder = new Folder(documentsFolder.fsName + "/Adobe/TimerData");
    if (!dataFolder.exists) {
        dataFolder.create();
    }

    var dataFile = new File(dataFolder.fsName + "/timerData.json");

    // --- Migracion legacy: datos guardados antiguamente en el Desktop ---
    try {
        var desktopDataFile = new File(Folder.desktop.fsName + "/timerData.json");
        if (desktopDataFile.exists) {
            desktopDataFile.copy(dataFile.fsName);
            desktopDataFile.remove();
        }
    } catch (migrateErr) {
        $.writeln("TimerKeeper: error en migracion legacy: " + migrateErr.message);
    }

    /**
     * Heuristica interna: detecta si el proyecto actual esta en conversion.
     * Reutiliza la logica probada de la referencia (isProjectBeingConverted).
     * @returns {Boolean}
     */
    function isProjectBeingConverted() {
        try {
            // Solo tiene sentido cuando el proyecto existe pero no esta guardado.
            if (!app.project || !app.project.file) {
                // Si hay elementos en el proyecto pero no esta guardado,
                // es probable que sea un proyecto en conversion entre versiones.
                if (app.project && app.project.numItems > 0) {
                    return true;
                }
                // Aproximacion: el nombre de build a veces refleja la conversion.
                var appTitle = app.buildName;
                if (appTitle && appTitle.indexOf("Converting") !== -1) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            $.writeln("TimerKeeper: error en isProjectBeingConverted: " + e.message);
            return false;
        }
    }

    /**
     * getSnapshot() -> JSON string con el estado del proyecto actual.
     * Forma: {"projectPath":..|null,"projectName":..|null,"unsaved":bool,"converting":bool}
     * Nunca lanza: ante cualquier excepcion devuelve el snapshot vacio.
     * @returns {String}
     */
    api.getSnapshot = function () {
        try {
            var snap = {
                projectPath: null,
                projectName: null,
                unsaved: false,
                converting: false
            };

            if (app.project) {
                if (app.project.file) {
                    // Proyecto guardado abierto.
                    snap.projectPath = app.project.file.fsName;
                    snap.projectName = app.project.file.name;
                    snap.unsaved = false;
                    snap.converting = false;
                } else {
                    // Proyecto sin guardar (existe app.project pero no hay file).
                    snap.projectPath = null;
                    snap.projectName = null;
                    snap.unsaved = true;
                    snap.converting = isProjectBeingConverted();
                }
            }

            return JSON.stringify(snap);
        } catch (e) {
            // Fallback exacto requerido por el contrato.
            return '{"projectPath":null,"projectName":null,"unsaved":false,"converting":false}';
        }
    };

    /**
     * loadData() -> contenido crudo de timerData.json.
     * "{}" si no existe o esta vacio; "false" si hay error de lectura.
     * @returns {String}
     */
    api.loadData = function () {
        try {
            if (dataFile.exists) {
                dataFile.encoding = "UTF8";
                var openResult = dataFile.open("r");
                if (!openResult) {
                    $.writeln("TimerKeeper: error abriendo archivo para lectura: " + dataFile.error);
                    return "false";
                }

                var dataString = dataFile.read();
                dataFile.close();

                // Trim ES3 (sin String.prototype.trim).
                dataString = dataString.replace(/^\s+|\s+$/g, "");

                if (dataString === "") {
                    return "{}";
                }
                return dataString;
            }
            // El archivo no existe.
            return "{}";
        } catch (e) {
            $.writeln("TimerKeeper: error cargando datos: " + e.message);
            return "false";
        }
    };

    /**
     * saveData(jsonDataString) -> "true"/"false".
     * Escritura atomica: temp + rename. Encoding UTF8.
     * @param {String} jsonDataString
     * @returns {String}
     */
    api.saveData = function (jsonDataString) {
        try {
            if (typeof jsonDataString !== 'string') {
                $.writeln("TimerKeeper: saveData recibio un valor que no es string.");
                return "false";
            }

            // Asegurar que la carpeta de datos existe.
            if (!dataFolder.exists) {
                var folderCreated = dataFolder.create();
                if (!folderCreated) {
                    $.writeln("TimerKeeper: no se pudo crear la carpeta de datos.");
                    return "false";
                }
            }

            // Escribir primero a un archivo temporal.
            var tempDataFile = new File(dataFolder.fsName + "/timerData_temp.json");
            tempDataFile.encoding = "UTF8";
            var openResult = tempDataFile.open("w");
            if (!openResult) {
                $.writeln("TimerKeeper: no se pudo abrir el temporal para escritura: " + tempDataFile.error);
                return "false";
            }

            var writeResult = tempDataFile.write(jsonDataString);
            tempDataFile.close();

            if (!writeResult) {
                $.writeln("TimerKeeper: fallo al escribir en el temporal: " + tempDataFile.error);
                if (tempDataFile.exists) {
                    tempDataFile.remove();
                }
                return "false";
            }

            // Eliminar el archivo original si existe (para permitir el rename).
            if (dataFile.exists) {
                try {
                    var removeResult = dataFile.remove();
                    if (!removeResult) {
                        $.writeln("TimerKeeper: no se pudo eliminar el archivo antiguo: " + dataFile.error + ". Intentando rename encima.");
                    }
                } catch (removeError) {
                    $.writeln("TimerKeeper: error eliminando archivo: " + removeError.message + ". Intentando rename encima.");
                }
            }

            // Rename atomico del temporal al nombre final.
            var renameResult = tempDataFile.rename("timerData.json");
            if (!renameResult) {
                $.writeln("TimerKeeper: no se pudo renombrar el temporal: " + tempDataFile.error);
                if (tempDataFile.exists) {
                    tempDataFile.remove();
                }
                return "false";
            }

            return "true";
        } catch (e) {
            $.writeln("TimerKeeper: error guardando datos: " + e.message);
            try {
                var tempFileOnError = new File(dataFolder.fsName + "/timerData_temp.json");
                if (tempFileOnError.exists) {
                    tempFileOnError.remove();
                }
            } catch (cleanupErr) {
                // Ignorar error de limpieza.
            }
            return "false";
        }
    };

    /**
     * saveBackup(jsonDataString) -> "true"/"false".
     * Escribe timerData.v1.backup.json (escritura directa, sin temp).
     * Backup de una sola vez: si ya existe, NO sobrescribe y devuelve "true".
     * @param {String} jsonDataString
     * @returns {String}
     */
    api.saveBackup = function (jsonDataString) {
        try {
            if (typeof jsonDataString !== 'string') {
                $.writeln("TimerKeeper: saveBackup recibio un valor que no es string.");
                return "false";
            }

            var backupFile = new File(dataFolder.fsName + "/timerData.v1.backup.json");

            // Backup de una sola vez: no sobrescribir.
            if (backupFile.exists) {
                return "true";
            }

            if (!dataFolder.exists) {
                var folderCreated = dataFolder.create();
                if (!folderCreated) {
                    $.writeln("TimerKeeper: no se pudo crear la carpeta de datos para el backup.");
                    return "false";
                }
            }

            backupFile.encoding = "UTF8";
            var openResult = backupFile.open("w");
            if (!openResult) {
                $.writeln("TimerKeeper: no se pudo abrir el backup para escritura: " + backupFile.error);
                return "false";
            }

            var writeResult = backupFile.write(jsonDataString);
            backupFile.close();

            if (!writeResult) {
                $.writeln("TimerKeeper: fallo al escribir el backup: " + backupFile.error);
                if (backupFile.exists) {
                    backupFile.remove();
                }
                return "false";
            }

            return "true";
        } catch (e) {
            $.writeln("TimerKeeper: error guardando backup: " + e.message);
            return "false";
        }
    };

    /**
     * openProjectFile(projectPath) -> "true" | "USER_CANCELED_CLOSE" | mensaje de error.
     * Normaliza la ruta por SO, cierra el proyecto actual con PROMPT_TO_SAVE_CHANGES
     * y verifica el proyecto tras la apertura.
     * @param {String} projectPath
     * @returns {String}
     */
    api.openProjectFile = function (projectPath) {
        try {
            $.writeln("Attempting to open project (unified function): " + projectPath);

            // --- Normalizacion de ruta ---
            var normalizedPath = projectPath;
            try {
                if (typeof projectPath === 'string') {
                    if ($.os.indexOf("Windows") !== -1) {
                        // En Windows usar backslashes, excepto para rutas UNC.
                        if (projectPath.substring(0, 2) !== "\\\\") {
                            normalizedPath = projectPath.replace(/\//g, "\\");
                        }
                    } else {
                        // En macOS/Unix usar forward slashes.
                        normalizedPath = projectPath.replace(/\\/g, "/");
                    }
                    $.writeln("Normalized path: " + normalizedPath);
                } else {
                    $.writeln("Warning: projectPath is not a string, skipping normalization.");
                    normalizedPath = String(projectPath);
                }
            } catch (normErr) {
                $.writeln("Error during path normalization: " + normErr.message + ". Using original path.");
                normalizedPath = projectPath;
            }

            // Crear el objeto File con la ruta normalizada.
            var projectFile = new File(normalizedPath);

            if (projectFile.exists) {
                $.writeln("Project file exists, attempting to open...");

                // --- Cerrar el proyecto actual (si procede) ---
                if (app.project && app.project.file && app.project.dirty) {
                    try {
                        var closeResult = app.project.close(CloseOptions.PROMPT_TO_SAVE_CHANGES);
                        if (!closeResult) {
                            // El usuario cancelo en el dialogo de guardado.
                            $.writeln("User cancelled the close/save operation.");
                            return "USER_CANCELED_CLOSE";
                        }
                        $.writeln("Project closed or saved successfully.");
                    } catch (closeError) {
                        $.writeln("Error closing project: " + closeError.message + ". Continuing attempt to open.");
                    }
                } else if (app.project && !app.project.file) {
                    // Cerrar un proyecto sin guardar ('Untitled').
                    try {
                        var closeResultUntitled = app.project.close(CloseOptions.PROMPT_TO_SAVE_CHANGES);
                        if (!closeResultUntitled) {
                            $.writeln("User cancelled the close/save operation for untitled project.");
                            return "USER_CANCELED_CLOSE";
                        }
                    } catch (closeErrorUntitled) {
                        $.writeln("Error closing untitled project: " + closeErrorUntitled.message);
                    }
                }

                // --- Abrir el nuevo proyecto ---
                try {
                    var openedProject = app.open(projectFile);
                    if (openedProject) {
                        $.writeln("Project opened successfully via app.open().");
                        if (app.project && app.project.file && app.project.file.fsName === projectFile.fsName) {
                            $.writeln("Verification successful: Correct project is active.");
                            return "true";
                        } else {
                            $.writeln("Verification Warning: app.open succeeded but intended project doesn't seem active.");
                            return "true";
                        }
                    } else {
                        $.writeln("app.open() did not return a project object (may have been cancelled or failed).");
                        if (app.project && app.project.file && app.project.file.fsName === projectFile.fsName) {
                            $.writeln("Verification: Correct project seems to be open now despite null return.");
                            return "true";
                        } else {
                            $.writeln("Verification: The intended project is not the currently active one after app.open returned null.");
                            return "Failed to confirm project opening.";
                        }
                    }
                } catch (openError) {
                    $.writeln("Error during app.open: " + openError.message);
                    if (openError.message.toLowerCase().indexOf("cancel") > -1) {
                        return "Operation possibly cancelled during open.";
                    }
                    return "Error opening file: " + openError.message;
                }
            } else {
                $.writeln("Project file does not exist or is not accessible after normalization: " + normalizedPath);
                return "Project file doesn't exist or can't be accessed.";
            }
        } catch (e) {
            $.writeln("General error in unified openProjectFile: " + e.message);
            return "General error opening project: " + e.message;
        }
    };

    /**
     * validateFilePath(filePath) -> JSON con detalles de acceso al archivo.
     * Forma: {"original":..,"normalized":..,"exists":bool,"readable":bool,"error":string}
     * Version simplificada de la referencia (solo logging importante).
     * @param {String} filePath
     * @returns {String}
     */
    api.validateFilePath = function (filePath) {
        var file = null;
        var result = {};

        try {
            file = new File(filePath);
            if (!file) {
                throw new Error("Could not create File object.");
            }

            var fileExists = file.exists;
            var fileReadable = false;
            var openError = "";

            if (fileExists) {
                try {
                    if (file.open("r")) {
                        fileReadable = true;
                        file.close();
                    } else {
                        openError = file.error || "Failed to open file for reading (unknown reason).";
                        $.writeln("TimerKeeper: file.open('r') devolvio false. Error: " + openError);
                    }
                } catch (openEx) {
                    openError = "Exception during file.open('r'): " + openEx.message;
                    $.writeln("TimerKeeper: " + openError);
                    fileReadable = false;
                }
            } else {
                openError = file.error || "File does not exist.";
            }

            result = {
                original: filePath,
                normalized: file.fsName || filePath,
                exists: fileExists,
                readable: fileReadable,
                error: openError
            };

            try {
                return JSON.stringify(result);
            } catch (stringifyEx) {
                $.writeln("TimerKeeper: error en JSON.stringify de validateFilePath: " + stringifyEx.message);
                return JSON.stringify({
                    original: filePath,
                    normalized: filePath,
                    exists: false,
                    readable: false,
                    error: "Error stringifying result: " + stringifyEx.message
                });
            }
        } catch (e) {
            $.writeln("TimerKeeper: error general en validateFilePath: " + e.message);
            var errorResult = {
                original: filePath,
                normalized: filePath,
                exists: false,
                readable: false,
                error: "General error: " + e.message
            };
            try {
                return JSON.stringify(errorResult);
            } catch (stringifyErrEx) {
                return '{"original":"","normalized":"","exists":false,"readable":false,"error":"Could not serialize error details"}';
            }
        }
    };

    /**
     * getDataFolderPath() -> ruta fsName de la carpeta de datos | "false".
     * @returns {String}
     */
    api.getDataFolderPath = function () {
        try {
            return dataFolder.fsName;
        } catch (e) {
            $.writeln("TimerKeeper: error obteniendo la ruta de la carpeta de datos: " + e.message);
            return "false";
        }
    };

    return api;
})();
