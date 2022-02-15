# ToDo
- Record video of changing display name, bundle id, version number, build number
- Record video of previewing in editor
- From packages have the option to update to any particular version found with `npm view package versions`
- Option to hide particular recommendations
- Update doc page of plugin with good descriptions and examples
- Show icon change when running
- View app in VS Code window
- Support @angular project upgrades (ie multiple package update)
- On Web projects that are Angular based hook up dist or configured folder
- Recommend: Capacitor 2 to 3 migration
- Recommend applying exact version numbers in package.json rather than ~ or ^
- From packages have an option to add (needs list of good packages)
- When building/syncing show percentage (eg Building 65%)
- On a build if node_modules is not found then add npm i (hence removing the install node_modules step)
- Use npm audit to list vulnerable packages
- Allow add of plugins: list all official capacitor, ionic enterprise, supported plugins
- If using say @capacitor/camera then allow editing of info.plist and Android permissions (highlight if empty)

# In Review
- Detect Capacitor CLI and fallback to it for non-ionic projects. This may make some functions impossible or non standard (eg build), current check ensures Ionic CLI is installed

# Bugs
- Validate input for bundle id (eg no java reserved words), display name and version and build (numbers)

# Known Issues
- Colorization of the output window is not supported in VS Code Extensions
- Badge option is not available for VS Code Extensions
