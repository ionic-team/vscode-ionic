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

# Publishing

Make sure Visual Studio Extension Manager is installed (`npm install -g vsce`).

Run

- `vsce package`
- A packaged with name `Ionic-0.0.1.vsix` will be created which can be installed or published to the marketplace.
