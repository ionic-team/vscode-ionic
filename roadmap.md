# ToDo
- Record video of changing display name, bundle id, version number, build number
- Record video of previewing in editor
- From packages have the option to update to any particular version found with `npm view package versions`
- Option to hide particular recommendations
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
- Validate input for bundle id (eg no java reserved words), display name and version and build (numbers)

# Known Issues
- Colorization of the output window is not supported in VS Code Extensions
- Badge option is not available for VS Code Extensions
- Show icon change when running is not supported by treeview without full refresh
