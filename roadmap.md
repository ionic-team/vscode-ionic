# Insider Requests
- Add features from Capacitor config

# ToDo
- From packages have the option to uninstall
- From packages have the option to update to any particular version found with `npm view package versions`
- Option to hide particular recommendations
- Detect Capacitor CLI and fallback to it for non-ionic projects
- Update doc page of plugin with good descriptions and examples
- Show icon change when running
- View app in VS Code window
- Support @angular project upgrades (ie multiple package update)
- On Web projects that are Angular based hook up dist or configured folder
- For packages put scopes in a tree. Eg @capacitor, @ionic etc
- Recommend: Capacitor 2 to 3 migration
- Recommend applying exact version numbers in package.json rather than ~ or ^

- Check for LTS support of npm and node and recommend updating
- If `package.json` detected but no `node_modules` folder yet then let the user know that you are running npm install
- From packages have an option to add (needs list of good packages)
- Use npm audit to list vulnerable packages

# Bugs
- Node 12.22.10 causes nothing to work
- Errors reported back from code have coloring but showMessage in VS Code does not and shows markup for colors
- Investigate colorization in the output window (eg a build will write color tags rather than colors)
- Settings only apply after a refresh
