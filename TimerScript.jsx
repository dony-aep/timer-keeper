function myScript(thisObj) {
    function myScript_buildUI(thisObj) {
        // Function Declarations
        
        // Add isClosing flag
        var isClosing = false;
        var isModalOpen = false; // New flag to detect modal dialogs
        
        // Timer Functions
        function startTimer() {
            try {
                if (timerRunning) {
                    $.writeln("Timer already running - ignoring start request");
                    return;
                }

                // Robust project validation
                if (!app.project) {
                    showAlert("No project is open.");
                    return;
                }

                if (!app.project.file) {
                    showAlert("Current project is not saved. Please save it first.");
                    return;
                }

                var projectPath = app.project.file.fsName;
                if (!projectPath || !File(projectPath).exists) {
                    showAlert("Project path is invalid or file does not exist.");
                    return;
                }

                timerRunning = true;
                projectTimers[projectPath] = projectTimers[projectPath] || 0;

                currentProject = {
                    name: app.project.file.name,
                    path: projectPath
                };

                startTime = new Date().getTime() - (projectTimers[projectPath] * 1000);
                
                // Make sure UI exists before updating it
                if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup) {
                    myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Pause";
                    // Start immediate update
                    updateTimer();
                    // Schedule next update
                    timerTaskId = app.scheduleTask("$.global.updateTimer()", 1000, false);
                    
                    populateRecentProjects();
                    saveTimerData();
                    
                    // New feedback message
                    showStatusMessage("Timer started for: " + currentProject.name);
                }

            } catch (e) {
                $.writeln("Error in startTimer: " + e.message);
                timerRunning = false;
                showAlert("Error starting timer: " + e.message);
            }
        }

        function pauseTimer() {
            try {
                if (!timerRunning) {
                    $.writeln("Timer not running - ignoring pause request");
                    return;
                }

                timerRunning = false;
                
                if (timerTaskId !== null) {
                    try {
                        app.cancelTask(timerTaskId);
                    } catch (e) {
                        $.writeln("Error canceling task: " + e.message);
                    }
                    timerTaskId = null;
                }

                if (currentProject && currentProject.path) {
                    var elapsedSeconds = Math.floor((new Date().getTime() - startTime) / 1000);
                    if (isNaN(elapsedSeconds) || elapsedSeconds < 0) {
                        elapsedSeconds = 0;
                    }
                    
                    projectTimers[currentProject.path] = elapsedSeconds;
                    
                    // Check if UI exists before updating it
                    if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup) {
                        myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Start";
                        myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = formatTime(elapsedSeconds);
                        
                        // Update list immediately
                        populateRecentProjects();
                        
                        // Select current project in list for visual feedback
                        selectProjectInList(currentProject.path);
                        
                        // New feedback message
                        showStatusMessage("Timer paused for: " + currentProject.name + "\nTotal time: " + formatTime(elapsedSeconds));
                    }

                    updateProjectInList(currentProject);
                    saveTimerData();
                }

            } catch (e) {
                $.writeln("Error in pauseTimer: " + e.message);
                showAlert("Error pausing timer: " + e.message);
            }
        }

        function resetTimer() {
            var projectsList = myPanel.grp.mainGroup.projectsPanel.projectsList;
            if (projectsList.selection != null && projectsList.selection.enabled) {
                var selectedItem = projectsList.selection;
                var projectPath = selectedItem.projectPath;
                var projectName = File(projectPath).name;

                var confirmReset = showConfirm("Are you sure you want to reset the timer for the project: " + projectName + "?");
                if (!confirmReset) {
                    return;
                }

                // Reset the selected project time
                projectTimers[projectPath] = 0;
                saveTimerData(); // Save data after reset

                // Update timer display if reset project is current
                if (currentProject && currentProject.path === projectPath) {
                    timerRunning = false;
                    if (timerTaskId !== null) {
                        app.cancelTask(timerTaskId);
                        timerTaskId = null;
                    }
                    myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = "00:00:00";
                    currentProject = null;
                    myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Start";
                }

                // Update projects list
                populateRecentProjects();

                showAlert("Timer reset for project: " + projectName);
            } else {
                showAlert("No project selected to reset.");
            }
        }

        function updateTimer() {
            try {
                if (!timerRunning || !currentProject) {
                    return;
                }

                var currentTime = new Date().getTime();
                var elapsedMilliseconds = currentTime - startTime;
                
                // Additional validation to prevent negative values
                if (elapsedMilliseconds < 0) {
                    elapsedMilliseconds = 0;
                    startTime = currentTime;
                }
                
                var elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
                var formattedTime = formatTime(elapsedSeconds);

                // Verify UI elements exist
                if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup && myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay) {
                    myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = formattedTime;
                }

                if (currentProject.path) {
                    projectTimers[currentProject.path] = elapsedSeconds;
                    updateProjectInList(currentProject);
                }

                // Schedule next update only if timer is still running
                if (timerRunning) {
                    if (timerTaskId !== null) {
                        app.cancelTask(timerTaskId);
                    }
                    timerTaskId = app.scheduleTask("$.global.updateTimer()", 1000, false);
                }

            } catch (e) {
                $.writeln("Error in updateTimer: " + e.message);
                timerRunning = false;
            }
        }

        // Make updateTimer function global
        $.global.updateTimer = updateTimer;

        // Function to load recent projects and populate the list
        function populateRecentProjects() {
            try {
                var recentProjects = getRecentProjects() || [];
                var projectsList = myPanel.grp.mainGroup.projectsPanel.projectsList;
                projectsList.removeAll();

                if (recentProjects.length === 0) {
                    var listItem = projectsList.add("item", "No recent projects");
                    listItem.enabled = false;
                    return;
                }

                for (var i = 0; i < recentProjects.length; i++) {
                    var item = recentProjects[i];
                    var formattedTime = formatTime(projectTimers[item.path] || 0);
                    
                    // Replace spaces and %20 with underscores in filename
                    var sanitizedName = item.name.replace(/ |%20/g, "_");
                    
                    var displayText = sanitizedName + " - " + formattedTime;
                    var listItem = projectsList.add("item", displayText);
                    listItem.projectPath = item.path;
                }
            } catch (e) {
                // Silently handle list update errors
            }
        }

        // Function to delete selected project from list
        function deleteSelectedProject() {
            var projectsList = myPanel.grp.mainGroup.projectsPanel.projectsList;
            if (projectsList.selection != null && projectsList.selection.enabled) {
                var index = projectsList.selection.index;
                var item = projectsList.items[index];
                var path = item.projectPath;

                var confirmDelete = showConfirm("Are you sure you want to delete the project: " + File(path).name + " from the Recent Projects list?");
                if (!confirmDelete) {
                    return;
                }

                delete projectTimers[path];
                projectsList.remove(index);

                saveTimerData(); // Save data after deletion
                showAlert("Project successfully deleted.");
            } else {
                showAlert("No project selected to delete.");
            }
        }

        // Function to get recent projects with active timer
        function getRecentProjects() {
            var projects = [];

            // Load projects from JSON file (previously saved)
            if (dataFile.exists) {
                // Removed: loadTimerData(); // Load data from JSON file

                for (var path in projectTimers) {
                    if (projectTimers.hasOwnProperty(path) && projectTimers[path] > 0) {
                        projects.push({
                            name: File(path).name,
                            path: path
                        });
                    }
                }
            }

            // Check if app.recentItems exists and filter projects with active timer
            if (app.recentItems && app.recentItems.length > 0) {
                for (var i = 0; i < app.recentItems.length; i++) {
                    var proj = app.recentItems[i];
                    if (proj instanceof File && proj.fsName.toLowerCase().endsWith(".aep")) {
                        // Avoid adding duplicates
                        var exists = false;
                        for (var j = 0; j < projects.length; j++) {
                            if (projects[j].path === proj.fsName) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists && projectTimers[proj.fsName] > 0) {
                            projects.push({
                                name: proj.name,
                                path: proj.fsName
                            });
                        }
                    }
                }
            }

            return projects;
        }

        // Function to format time in HH:MM:SS
        function formatTime(seconds) {
            // Make sure seconds is a valid number
            seconds = Number(seconds);
            if (isNaN(seconds) || seconds < 0) {
                seconds = 0;
            }

            var hrs = Math.floor(seconds / 3600);
            var mins = Math.floor((seconds % 3600) / 60);
            var secs = seconds % 60;
            return (hrs < 10 ? "0" + hrs : hrs) + ":" + 
                   (mins < 10 ? "0" + mins : mins) + ":" + 
                   (secs < 10 ? "0" + secs : secs);
        }

        // Function to update a project in the list
        function updateProjectInList(project) {
            try {
                var projectsList = myPanel.grp.mainGroup.projectsPanel.projectsList;
                for (var i = 0; i < projectsList.items.length; i++) {
                    var item = projectsList.items[i];
                    if (item.projectPath === project.path) {
                        var formattedTime = formatTime(projectTimers[project.path] || 0);
                        var sanitizedName = project.name.replace(/ |%20/g, "_");
                        item.text = sanitizedName + " - " + formattedTime;
                        break;
                    }
                }
            } catch (e) {
                // Silently handle list update errors
            }

        }

        // Helper function to get current project path
        function currentProjectPath() {
            if (app.project && app.project.file) {
                return app.project.file.fsName;
            }
            return null;
        }

        // Function to monitor project changes in real time
        function monitorProjects() {
            var previousPath = currentProjectPath();
            var checkInterval = 2000; // 2 seconds

            var monitorTask = function() {
                try {
                    var currentPath = currentProjectPath();

                    if (currentPath !== previousPath) {
                        // If there's a previous project with running timer, save it
                        if (timerRunning && previousPath) {
                            $.writeln("Project change detected. Pausing previous timer...");
                            pauseTimer(); // This will save the time of the previous project
                        }

                        previousPath = currentPath;

                        // If there's a new project open
                        if (currentPath) {
                            $.writeln("New project detected: " + currentPath);
                            
                            // Make sure the previous project is completely stopped
                            timerRunning = false;
                            if (timerTaskId !== null) {
                                app.cancelTask(timerTaskId);
                                timerTaskId = null;
                            }

                            // Initialize new project if it doesn't exist in projectTimers
                            if (projectTimers[currentPath] === undefined) {
                                projectTimers[currentPath] = 0;
                                saveTimerData();
                            }

                            // Configure the new project
                            currentProject = {
                                name: File(currentPath).name,
                                path: currentPath
                            };

                            // Update UI for the new project
                            if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup) {
                                var elapsedSeconds = projectTimers[currentPath] || 0;
                                myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = formatTime(elapsedSeconds);
                                myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Start";

                                // Auto-start if it already has recorded time
                                if (projectTimers[currentPath] > 0) {
                                    startTime = new Date().getTime() - (elapsedSeconds * 1000);
                                    timerRunning = true;
                                    myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Pause";
                                    updateTimer();
                                }
                            }

                            // Update project list
                            populateRecentProjects();
                        }
                    }

                    // Schedule next check only if script is not closing
                    if (!isClosing) {
                        try {
                            if (timerTaskId !== null) {
                                app.cancelTask(timerTaskId);
                            }
                            timerTaskId = app.scheduleTask("$.global.monitorProjects()", checkInterval, false);
                        } catch (e) {
                            $.writeln("Error scheduling monitorProjects: " + e.message);
                        }
                    }
                } catch (e) {
                    $.writeln("Error in monitorProjects: " + e.message);
                    // Try to recover monitoring
                    if (!isClosing) {
                        app.scheduleTask("$.global.monitorProjects()", checkInterval, false);
                    }
                }
            };

            // Assign monitorTask function to global version
            $.global.monitorProjects = monitorTask;
            // Start monitoring
            monitorTask();
        }

        // Function to save data to JSON file
        function saveTimerData() {
            try {
                // Write to temporary file first
                var tempDataFile = new File(desktopPath + "/timerData_temp.json");
                tempDataFile.encoding = "UTF8";
                var openResult = tempDataFile.open("w");
                if (!openResult) {
                    throw new Error("Could not open temporary file for writing.");
                }
                var dataString = JSON.stringify(projectTimers, null, 4);
                tempDataFile.write(dataString);
                tempDataFile.close();

                // Rename temporary file to timerData.json
                if (dataFile.exists) {
                    dataFile.remove(); // Remove original file if exists
                }
                var renameResult = tempDataFile.rename("timerData.json");
                if (!renameResult) {
                    throw new Error("Could not rename temporary file.");
                }
            } catch (e) {
                // Replace alert with $.writeln to avoid interrupting the user
                $.writeln("Error saving data: " + e.message);
            }
        }

        // Function to load data from JSON file
        function loadTimerData() {
            projectTimers = {}; // Initialize projectTimers before loading

            if (dataFile.exists) {
                try {
                    dataFile.encoding = "UTF8";
                    var openResult = dataFile.open("r");
                    if (!openResult) {
                        throw new Error("Could not open file for reading.");
                    }
                    var dataString = dataFile.read();
                    dataFile.close();

                    // Replace trim() with compatible alternative
                    dataString = dataString.replace(/^\s+|\s+$/g, "");
                    $.writeln("Data read from file: " + dataString);

                    if (dataString === "") {
                        // If file is empty, initialize projectTimers as empty object
                        projectTimers = {};
                        $.writeln("Data file is empty. projectTimers initialized as empty object.");
                        return;
                    }

                    try { 
                        var loadedData = JSON.parse(dataString); 
                        $.writeln("JSON data parsed successfully.");
                    } catch (e) { 
                        $.writeln("Error parsing JSON: " + e.message);
                        // Retry loading
                        $.writeln("Attempting to retry data loading.");
                        $.sleep(500);
                        try {
                            dataFile.open("r");
                            dataString = dataFile.read();
                            dataFile.close();
                            loadedData = JSON.parse(dataString);
                            $.writeln("Data reload successful.");
                        } catch (e) {
                            $.writeln("Retry failed: " + e.message);
                            loadedData = {}; 
                        }
                    }
                    // Make sure loadedData is a valid object
                    if (typeof loadedData === "object" && loadedData !== null) {
                        projectTimers = loadedData;
                        $.writeln("projectTimers updated with loaded data.");
                    } else {
                        // If loadedData is not a valid object, initialize as empty object
                        projectTimers = {};
                        $.writeln("loadedData is not a valid object. projectTimers initialized as empty object.");
                    }
                } catch (e) {
                    $.writeln("Error loading data: " + e.message);
                    projectTimers = {};
                }
            } else {
                // Check if file doesn't exist
                projectTimers = {};
                $.writeln("Data file does not exist. projectTimers initialized as empty object.");
            }
        }

        // -------------------------------
        // New Helper Functions
        // -------------------------------

        // Function to show alerts without blocking
        function showAlert(message) {
            if (!isModalOpen) {
                isModalOpen = true;
                alert(message);
                isModalOpen = false;
            } else {
                $.writeln("Alert skipped because a modal is open: " + message);
            }
        }

        // Function to show confirmations without blocking multiple dialogs
        function showConfirm(message) {
            if (!isModalOpen) {
                isModalOpen = true;
                var result = confirm(message);
                isModalOpen = false;
                return result;
            } else {
                $.writeln("Confirm skipped because a modal is open: " + message);
                return false;
            }
        }

        // Function to add Refresh button to UI
        function addRefreshButton() {
            var refreshButton = myPanel.grp.mainGroup.projectsPanel.actionsGroup.add("button", undefined, "Refresh Data");
            refreshButton.onClick = function() {
                // Pause timer if running to avoid conflicts
                if (timerRunning) {
                    pauseTimer();
                }
                // Reload data
                loadTimerData();
                // Update recent projects list
                populateRecentProjects();
                // Reset counter and related variables
                resetTimerDisplay();
                // Inform user
                showAlert("Timer data refreshed successfully and counter reset.");
            };
        }

        // Function to reset timer display and variables
        function resetTimerDisplay() {
            try {
                // Stop any scheduled tasks
                if (timerTaskId !== null) {
                    app.cancelTask(timerTaskId);
                    timerTaskId = null;
                }

                // Reset timer variables
                timerRunning = false;
                startTime = 0;

                // Clear UI
                if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup) {
                    myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = "00:00:00";
                    myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Start";
                }

            } catch (e) {
                $.writeln("Error resetting display: " + e.message);
            }
        }

        // -------------------------------
        // UI Configuration
        // -------------------------------

        // Define main UI with improved layout
        var res = "group{orientation:'column', spacing:10, margins:[15,10,15,10], alignChildren:['fill','top'],\
            headerGroup: Group{orientation:'column', spacing:5, alignChildren:['fill','top'],\
                timerPanel: Panel{text:'Timer', orientation:'column', margins:[15,15,15,15], spacing:8,\
                    timerGroup: Group{orientation:'row', spacing:10, alignChildren:['center','center'],\
                        timeDisplay: StaticText{text:'00:00:00', properties:{style:'bold'}, preferredSize:[80,20], alignment:['center','center']},\
                        buttonsGroup: Group{orientation:'row', spacing:5, alignChildren:['center','center'],\
                            startPauseButton: Button{text:'Start', preferredSize:[70,25]},\
                            resetButton: Button{text:'Reset', preferredSize:[70,25]}\
                        }\
                    }\
                }\
            },\
            mainGroup: Group{orientation:'column', spacing:8, alignChildren:['fill','fill'],\
                projectsPanel: Panel{text:'Recent Projects', orientation:'column', margins:[15,15,15,15], spacing:8,\
                    projectsList: ListBox{alignment:['fill','fill'], preferredSize:[-1,150], properties:{multiselect:false}},\
                    actionsGroup: Group{orientation:'row', spacing:5, alignChildren:['center','center'],\
                        deleteButton: Button{text:'Delete', preferredSize:[80,25]},\
                        refreshButton: Button{text:'Refresh', preferredSize:[80,25]}\
                    }\
                }\
            },\
            footerGroup: Group{orientation:'column', spacing:5, alignChildren:['fill','bottom'],\
                separator: Panel{height:1},\
                statusGroup: Group{orientation:'row', spacing:5, alignChildren:['fill','center'],\
                    statusText: StaticText{text:'', alignment:['fill','center'], properties:{multiline:true}, preferredSize:[-1,30]},\
                    helpButton: Button{text:'Help', preferredSize:[60,25], alignment:['right','center']}\
                },\
                watermark: StaticText{text:'Made by dony.', alignment:['right','bottom'], properties:{style:'italic'}}\
            }\
        }";

        var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Timer & Recent Projects", undefined, {resizeable: true});

        // Add UI to panel
        try {
            myPanel.grp = myPanel.add(res);
        } catch (e) {
            alert("Error building user interface: " + e.message);
            return null;
        }

        // Timer Variables
        var timerRunning = false;
        var startTime = 0;
        var currentProject = null;
        var timerTaskId = null;

        // Object to store accumulated times
        var projectTimers = {};

        // Path to JSON file
        var desktopPath = Folder.desktop.fsName;
        var dataFile = new File(desktopPath + "/timerData.json");

        // Initialize timer display
        myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = "00:00:00";

        // Load existing data
        loadTimerData();

        // Start/Pause Button Functionality
        myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.onClick = function() {
            if (!timerRunning) {
                startTimer();
            } else {
                pauseTimer();
            }
        };

        // Reset Button Functionality
        myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.resetButton.onClick = function() {
            resetTimer();
        };

        // Delete Button Functionality
        myPanel.grp.mainGroup.projectsPanel.actionsGroup.deleteButton.onClick = function() {
            deleteSelectedProject();
        };

        // Refresh Button Functionality
        myPanel.grp.mainGroup.projectsPanel.actionsGroup.refreshButton.onClick = function() {
            if (timerRunning) {
                pauseTimer();
            }
            loadTimerData();
            populateRecentProjects();
            resetTimerDisplay();
            showAlert("Timer data refreshed successfully and counter reset.");
        };

        // Help Button Functionality
        myPanel.grp.footerGroup.statusGroup.helpButton.onClick = function() {
            showHelp();
        };

        // Function to show help panel
        function showHelp() {
            if (isModalOpen) {
                $.writeln("Attempt to open Help while another modal is open.");
                return;
            }
            
            isModalOpen = true;
            var helpWindow = new Window("dialog", "Help & Documentation");
            helpWindow.alignChildren = ["fill", "top"];
            helpWindow.orientation = "column";
            helpWindow.spacing = 10;
            helpWindow.margins = [25, 20, 15, 20];

            // Main options panel
            var mainGroup = helpWindow.add("group");
            mainGroup.orientation = "column";
            mainGroup.alignChildren = ["fill", "top"];
            mainGroup.spacing = 10;
            mainGroup.margins = 0;

            // Main Functions Panel
            var mainFunctionsPanel = mainGroup.add("panel", undefined, "Main Functions");
            mainFunctionsPanel.alignChildren = ["fill", "top"];
            mainFunctionsPanel.orientation = "column";
            mainFunctionsPanel.spacing = 10;
            mainFunctionsPanel.margins = [25, 15, 15, 15];

            addHelpSection(mainFunctionsPanel, [
                "• Start/Pause: Controls current project time",
                "• Reset: Resets selected project counter",
                "• Time is automatically saved when paused"
            ]);

            // Project Management Panel
            var projectsPanel = mainGroup.add("panel", undefined, "Project Management");
            projectsPanel.alignChildren = ["fill", "top"];
            projectsPanel.orientation = "column";
            projectsPanel.spacing = 10;
            projectsPanel.margins = [25, 15, 15, 15];

            addHelpSection(projectsPanel, [
                "• Double-click: Opens selected project",
                "• Delete: Removes project from list",
                "• Refresh: Updates list and times"
            ]);

            // Automatic Features Panel
            var featuresPanel = mainGroup.add("panel", undefined, "Automatic Features");
            featuresPanel.alignChildren = ["fill", "top"];
            featuresPanel.orientation = "column";
            featuresPanel.spacing = 10;
            featuresPanel.margins = [25, 15, 15, 15];

            addHelpSection(featuresPanel, [
                "• Automatic time saving",
                "• Project change detection",
                "• Previous session recovery"
            ]);

            // Important Tips Panel
            var tipsPanel = mainGroup.add("panel", undefined, "Important Tips");
            tipsPanel.alignChildren = ["fill", "top"];
            tipsPanel.orientation = "column";
            tipsPanel.spacing = 10;
            tipsPanel.margins = [25, 15, 15, 15];

            addHelpSection(tipsPanel, [
                "• Pause timer before changing projects",
                "• Save your project before starting timer",
                "• Use Refresh if data doesn't update"
            ]);

            // Separator
            helpWindow.add("panel", undefined, "").border = "thin";

            // Version and buttons group
            var bottomGroup = helpWindow.add("group");
            bottomGroup.orientation = "row";
            bottomGroup.alignChildren = ["center", "center"];
            bottomGroup.alignment = ["fill", "bottom"];
            bottomGroup.spacing = 10;
            bottomGroup.margins = [0, 5, 0, 0];

            var versionText = bottomGroup.add("statictext", undefined, "Version: 2.0");
            versionText.alignment = ["left", "center"];

            // Buttons
            var buttonsGroup = helpWindow.add("group");
            buttonsGroup.orientation = "row";
            buttonsGroup.alignChildren = ["center", "center"];
            buttonsGroup.spacing = 20;
            buttonsGroup.alignment = ["right", "center"];

            var closeButton = buttonsGroup.add("button", undefined, "Close", {name: "ok"});
            closeButton.preferredSize.width = 80;

            // Simplified helper function
            function addHelpSection(parent, items) {
                var itemsText = parent.add("statictext", undefined, items.join("\n"), {multiline: true});
            }

            closeButton.onClick = function() {
                helpWindow.close();
            };

            helpWindow.onClose = function() {
                isModalOpen = false;
            };

            helpWindow.defaultElement = closeButton;
            helpWindow.cancelElement = closeButton;
            helpWindow.minimumSize = [295, 450];
            helpWindow.center();
            helpWindow.show();
        }

        // Modify double-click functionality
        myPanel.grp.mainGroup.projectsPanel.projectsList.onDoubleClick = function() {
            var selectedItem = this.selection;
            if (selectedItem && selectedItem.projectPath) {
                try {
                    // Check if timer is active
                    if (timerRunning) {
                        showAlert("Please pause the current project timer before switching to another project.\n\n" + 
                                 "Current project: " + currentProject.name + "\n" +
                                 "Current time: " + myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text);
                        return;
                    }

                    // Check if opening operation is in progress
                    if (isModalOpen) {
                        $.writeln("Opening operation already in progress");
                        return;
                    }

                    var projectFile = new File(selectedItem.projectPath);
                    if (projectFile.exists) {
                        isModalOpen = true;
                        showStatusMessage("Opening project: " + projectFile.name);
                        
                        try {
                            app.open(projectFile);
                            // Start timer after project opens
                            initializeNewProjectTimer(projectFile.fsName);
                        } catch (e) {
                            showAlert("Error opening project: " + e.message);
                        } finally {
                            isModalOpen = false;
                        }
                    } else {
                        showAlert("Project file doesn't exist or can't be accessed.");
                    }
                } catch (e) {
                    isModalOpen = false;
                    showAlert("Error processing project opening: " + e.message);
                }
            }
        };

        // Function to initialize timer for new project
        function initializeNewProjectTimer(projectPath) {
            try {
                if (!app.project || !app.project.file || app.project.file.fsName !== projectPath) {
                    $.writeln("Project not ready or doesn't match expected");
                    return;
                }

                // Set up current project
                currentProject = {
                    name: app.project.file.name,
                    path: projectPath
                };

                // Get accumulated time
                var savedTime = projectTimers[projectPath] || 0;
                
                // Set start time
                startTime = new Date().getTime() - (savedTime * 1000);
                
                // Start timer
                timerRunning = true;
                
                // Update UI
                if (myPanel && myPanel.grp && myPanel.grp.headerGroup && myPanel.grp.headerGroup.timerPanel && myPanel.grp.headerGroup.timerPanel.timerGroup) {
                    myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = formatTime(savedTime);
                    myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Pause";
                    updateTimer();
                }

                // Select project in list
                selectProjectInList(projectPath);
                
                // Show status message
                showStatusMessage("Timer started for: " + currentProject.name + "\nAccumulated time: " + formatTime(savedTime));
                
                // Update project list
                populateRecentProjects();

            } catch (e) {
                $.writeln("Error initializing new project: " + e.message);
                showAlert("Error initializing new project: " + e.message);
            }
        }

        // Make function globally accessible
        $.global.initializeNewProjectTimer = initializeNewProjectTimer;

        // Function to load recent projects and fill list
        populateRecentProjects();

        // Start project monitoring
        monitorProjects();

        // Save data when panel closes
        myPanel.onClose = function() {
            isClosing = true; // Indicate script is closing
            if (timerRunning) {
                pauseTimer();
            }
            saveTimerData();
        };

        myPanel.onResizing = myPanel.onResize = function () {
            this.layout.resize();
        };

        // Function to reset timer display and variables
        function resetTimerDisplay() {
            // Reset timer variables
            timerRunning = false;
            currentProject = null;
            startTime = 0;
            timerTaskId = null;

            // Update timer display
            myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.text = "00:00:00";
            myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.text = "Start";
        }

        // Adjust layout
        myPanel.layout.layout(true);
        myPanel.layout.resize();

        // New function to show temporary status messages
        function showStatusMessage(message) {
            try {
                // Create status panel if it doesn't exist
                if (!myPanel.grp.footerGroup.statusGroup.statusText) {
                    myPanel.grp.footerGroup.statusGroup.statusText = myPanel.grp.footerGroup.add("statictext", undefined, "", {multiline: true});
                    myPanel.grp.footerGroup.statusGroup.statusText.alignment = ["fill", "bottom"];
                    myPanel.grp.footerGroup.statusGroup.statusText.justify = "center";
                    myPanel.layout.layout(true);
                }

                myPanel.grp.footerGroup.statusGroup.statusText.text = message;
                
                // Increase time to 5 seconds (5000 ms)
                app.scheduleTask('clearStatusMessage()', 5000, false);
                
            } catch (e) {
                $.writeln("Error showing status message: " + e.message);
            }
        }

        // Function to clear status message
        function clearStatusMessage() {
            try {
                if (myPanel && myPanel.grp && myPanel.grp.footerGroup && myPanel.grp.footerGroup.statusGroup && myPanel.grp.footerGroup.statusGroup.statusText) {
                    myPanel.grp.footerGroup.statusGroup.statusText.text = "";
                }
            } catch (e) {
                $.writeln("Error clearing status message: " + e.message);
            }
        }

        // New function to select project in list
        function selectProjectInList(projectPath) {
            try {
                var projectsList = myPanel.grp.mainGroup.projectsPanel.projectsList;
                for (var i = 0; i < projectsList.items.length; i++) {
                    if (projectsList.items[i].projectPath === projectPath) {
                        projectsList.selection = i;
                        // Ensure selected item is visible
                        projectsList.revealItem(i);
                        break;
                    }
                }
            } catch (e) {
                $.writeln("Error selecting project in list: " + e.message);
            }
        }

        // Make message clearing function global
        $.global.clearStatusMessage = clearStatusMessage;
        
        // Section where buttons and their functionalities are defined
        myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.startPauseButton.helpTip = 
            "Start or pause the timer for the current project\n" +
            "Starts tracking time when a project is open\n" +
            "Pauses and saves the current time when clicked again";

        myPanel.grp.headerGroup.timerPanel.timerGroup.buttonsGroup.resetButton.helpTip = 
            "Reset the timer for the selected project\n" +
            "This will set the accumulated time back to zero\n" +
            "Requires confirmation before resetting";

        myPanel.grp.mainGroup.projectsPanel.actionsGroup.deleteButton.helpTip = 
            "Remove the selected project from the list\n" +
            "This will delete all time tracking data for this project\n" +
            "Requires confirmation before deleting";

        myPanel.grp.mainGroup.projectsPanel.actionsGroup.refreshButton.helpTip = 
            "Refresh the project list and timer data\n" +
            "Updates the display with the latest information\n" +
            "Useful if data seems out of sync";

        myPanel.grp.footerGroup.statusGroup.helpButton.helpTip = 
            "Show help and documentation\n" +
            "Includes detailed information about features\n" +
            "and how to use the timer";

        myPanel.grp.mainGroup.projectsPanel.projectsList.helpTip = 
            "List of projects with accumulated time\n" +
            "Double-click to open a project\n" +
            "Select a project to reset or delete its timer";

        myPanel.grp.headerGroup.timerPanel.timerGroup.timeDisplay.helpTip = 
            "Current accumulated time\n" +
            "Format: HH:MM:SS\n" +
            "Updates every second while timer is running";

        return myPanel;
    }

    var myScriptPal = myScript_buildUI(thisObj);

    if (myScriptPal != null && myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    }
}

// Initialize script
myScript(this);