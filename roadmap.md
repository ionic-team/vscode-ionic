# ToDo
- (bug) Validate input for bundle id (eg no java reserved words), display name and version and build (numbers)
- (bug) First run for web doesnt show the preview pane
- (docs) Record video of changing display name, bundle id, version number, build number
- (docs) Record video of previewing in editor
- (feat) From packages have the option to update to any particular version found with `npm view package versions`
- (feat) Option to hide particular recommendations
- (feat) Add queue points on a running command so that you can get progress like: "building...", "deploying...", "running app.."
- (feat) On clicking action show the action in the output window
- (perf) Cache outdated in workspace storage for use on first startup
- (perf) Run first refresh without "npm outdated", re-refresh after completion
- (perf) Only run capacitor config commands when "Configuration" is expanded
- Preview app - add option to switch size for common screen sizes
- Preview app - switch between ios and android (	url += '?ionic:mode=ios';)
- For web based projects have "Run on Web" under an Ionic Project
- Push console log from iframe to vscode output
- Bundle Analyser button, use stats.json for own report
- Support @angular project upgrades (ie multiple package update)
- On Web projects that are Angular based hook up dist or configured folder
- Recommend: Capacitor 2 to 3 migration
- Recommend applying exact version numbers in package.json rather than ~ or ^
- Allow add of plugins: list all official capacitor, ionic enterprise, supported plugins
- Use npm audit to list vulnerable packages
- If using say @capacitor/camera then allow editing of info.plist and Android permissions (highlight if empty)

# In Review
- Detect Capacitor CLI and fallback to it for non-ionic projects. This may make some functions impossible or non standard (eg build), current check ensures Ionic CLI is installed

# Bugs


# Known Issues
- Colorization of the output window is not supported in VS Code Extensions
- Badge option is not available for VS Code Extensions
- Show icon change when running is not supported by treeview without full refresh
- links to external content cannot open in VS Code editor window (must be browser)