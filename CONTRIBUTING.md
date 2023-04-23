# Getting Started

Optionally install Volta: https://docs.volta.sh/guide/getting-started

Ensure Visual Studio Extension Manager:

- `npm install -g vsce`

For this project install dependencies:

- `npm install`

# Debugging

- Press F5 in VSCode to start debugging the extension. It will open a VS Code window with the extension installed.

# Testing the build

To create a test build of the extension (ie create a `.vsix` file):

- `npm run build`
- Install the built `.vsix` file in VS Code

# Building the plugin manager

The Plugin Manager is an Angular application that works with the VS Code extension to search for and display plugins. You can build it
by opening this project with the VS Code extension and clicking `Scripts` > `build`. Alternatively, you can `cd plugin-explorer`, `npm install`, and `npm run build`. This will compile the app to the right folder, and when you run the VS Code extension it will display
it when visiting packages.

# Publishing

Make sure Visual Studio Extension Manager is installed (`npm install -g vsce`).

Run

- `vsce package`
- A packaged with name `Ionic-0.0.1.vsix` will be created which can be installed or published to the marketplace.

You can upload to the marketplace with `vsce publish` or you can manually upload the .vsix file [here](https://marketplace.visualstudio.com/manage/publishers/ionic).

# Publish Prerelease

You need a personal access token (see [here](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#get-a-personal-access-token)).

Run

- `vsce login Ionic` (make sure the I is capitalized)
- `vsce publish --pre-release`
