# Timer Script by dony.

## Description
Timer Script is a powerful script for Adobe After Effects designed to help users track and manage the time spent on individual projects. Whether you're working on multiple compositions or juggling several projects simultaneously, this script provides an intuitive interface to monitor your workflow efficiently. By keeping a detailed log of your active projects, Timer Script enhances productivity and ensures you stay on top of your deadlines.

## Current Version
**v2.0** - Complete UI redesign with enhanced functionality, robust error handling and comprehensive user feedback system.

## Installation
1. **Locate the After Effects ScriptUI Panels Folder:**
   ```
   C:\Program Files\Adobe\Adobe After Effects [Version]\Support Files\Scripts\ScriptUI Panels
   ```
2. **Place the Script File:**
   - Copy the `TimerScript.jsx` file into the `ScriptUI Panels` folder.
3. **Access the Script in After Effects:**
   - Open Adobe After Effects.
   - Navigate to `Window > TimerScript.jsx` to launch the panel.

## Main Features
- **Start/Pause Timer:**
  - Easily start or pause the timer for the current project with a single click.
  
- **Reset Timer:**
  - Reset the timer for a selected project to track time from scratch.
  
- **Recent Projects Management:**
  - View a list of recent projects with active timers.
  - Delete selected projects from the recent list.
  
- **Refresh Data:**
  - Manually reload timer data from the JSON file to ensure the latest information is displayed.
  - Automatically resets the timer display upon refreshing to prevent conflicts with previous project data.
  
- **Open Project on Double-Click:**
  - Quickly open a project by double-clicking it in the Recent Projects list.
  
- **Automatic Monitoring:**
  - Automatically pauses the timer when switching between projects.
  - Automatically starts the timer for newly opened projects.
  
- **Persistent Data Storage:**
  - Saves timer data to a JSON file on your desktop, ensuring your progress is retained between sessions.
  
- **User-Friendly Interface:**
  - Clean and intuitive UI with buttons for all major functions.
  - Displays elapsed time in `HH:MM:SS` format.
  
- **Help & Documentation:**
  - Built-in help panel providing detailed usage instructions and guidance.

## Usage
1. **Open Adobe After Effects.**
2. **Launch the Timer Panel:**
   - Go to `Window > TimerScript`.
3. **Start the Timer:**
   - Click the **Start** button to begin tracking time for the current project.
   - A status message will confirm that the timer has started along with the initial time.
4. **Pause the Timer:**
   - Click the **Pause** button to pause the timer. A status message will display the paused time.
5. **Reset the Timer:**
   - Select a project from the **Recent Projects** list.
   - Click the **Reset** button to reset its timer to `00:00:00`.
6. **Delete a Project:**
   - Select a project from the **Recent Projects** list.
   - Click the **Delete Selected** button to remove it from the list.
7. **Refresh Data:**
   - Click the **Refresh Data** button to manually reload timer data from the JSON file.
   - This action will reset the timer display to ensure no residual data causes conflicts.
8. **Open Project on Double-Click:**
   - Double-click any project listed under **Recent Projects** to open it directly in After Effects.
9. **Access Help:**
   - Click the **Help** button to view detailed instructions and information about the script.
10. **Status Messages:**
    - The status area at the bottom of the panel will display temporary messages about current operations.
11. **Tooltips:**
    - Hover over any button or interface element to see a detailed description of its function.

## Note
If you leave the script open when closing Adobe After Effects and later reopen After Effects with the script still open, it **might not load** the previously saved information correctly. To ensure that all data loads properly, you can click the **Refresh** button to reload the saved timer data, or alternatively, close and reopen the script panel after launching Adobe After Effects.

When switching between projects, it's recommended to pause the timer first. If you try to open another project by double-clicking it in the Recent Projects list while the timer is running, the script will display a warning message saying "Please pause the current project timer before switching to another project" along with details about the current project name and elapsed time. This warning helps prevent timing conflicts. The same caution applies when opening projects through File -> Open Project... or from the Home window (the default window showing recently opened After Effects projects). Pausing the timer ensures accurate time tracking between project switches.

## Version History

### v2.0 (Major UI and Architecture Overhaul)
- **Complete UI Redesign:**
  - Implemented a new three-panel layout (header, main, footer)
  - Added comprehensive status message system
  - Improved visual hierarchy and component organization
  - Enhanced spacing and alignment throughout the interface
  - Added persistent status display area for user feedback
  - Integrated new watermark and branding elements

- **Enhanced Project Management:**
  - Added robust project validation system
  - Improved project path handling and validation
  - Enhanced project switching mechanism
  - Added visual feedback for project selection
  - Better handling of project names with special characters

- **Advanced Timer Features:**
  - Implemented comprehensive timer state management
  - Added robust error handling for timer operations
  - Enhanced timer data validation and calculations
  - Improved synchronization between UI and timer state
  - Added detailed time tracking feedback

- **Improved User Experience:**
  - Added tooltips for all major UI elements
  - Enhanced help system with better organization
  - Implemented temporary status messages
  - Added detailed feedback for all user actions
  - Improved project list interaction and feedback

- **Technical Improvements:**
  - Restructured code architecture for better maintainability
  - Enhanced error handling throughout the script
  - Improved data validation and sanitization
  - Optimized memory management
  - Enhanced file operations for data persistence
  - Better handling of modal dialogs and UI states

### v1.1 (Enhanced Functionality)
- **Added Refresh Data Feature:**
  - Introduced a **Refrescar Datos** button to manually reload timer data from the JSON file.
  - Ensures that the latest timer information is accurately displayed in the Recent Projects panel.
  
- **Open Project on Double-Click:**
  - Enabled opening a project directly from the Recent Projects list by double-clicking on it.
  
- **Improved Error Handling:**
  - Enhanced robustness to prevent script freezing when adding new projects not previously stored.
  - Implemented checks to avoid executing scripts while modal dialogs are open, preventing common After Effects errors.
  
- **Reset Timer Display on Refresh:**
  - Automatically resets the timer display upon refreshing data to eliminate residual information from previous projects.
  
- **Enhanced Modal Dialog Management:**
  - Added flags to detect and manage modal dialogs, ensuring that alerts and confirmations do not interfere with script execution.
  
- **Optimized Data Saving Mechanism:**
  - Updated the data saving process to write to a temporary file first before renaming, reducing the risk of data corruption.

### v1.0 (Initial Release)
- Added core timer functionalities: start, pause, and reset.
- Implemented recent projects tracking with persistent storage.
- Designed user-friendly interface with essential buttons.
- Introduced automatic project monitoring to handle timer state based on active projects.
- Integrated a help panel for user guidance and support.

## Support
If you need help or want to provide feedback, you can contact me here:
[https://linktr.ee/Dony.ae](https://linktr.ee/Dony.ae)

Enjoy using Timer Script and boost your After Effects workflow! :>