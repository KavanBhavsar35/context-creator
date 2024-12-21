# Context Creator Extension for VS Code

## Overview

The **Context Creator** extension allows users to explore the files in their workspace, select files using checkboxes, and generate a single output file containing the content of the selected files. It provides an intuitive tree-view interface integrated into the Activity Bar and includes features such as toggling all file selections and generating consolidated files with ease. This tool is tailored for generating and sharing context effortlessly with AI tools like ChatGPT, Claude, or Gemini.

---

## Features

1. **Tree View of Workspace Files**

   - Displays all files and directories in the workspace.
   - Excludes ".git" and "node_modules" directories from the view.

2. **Checkbox Selection**

   - Use checkboxes to select files directly in the tree view.
   - Toggle between checked and unchecked states.

3. **Select/Deselect All Files**

   - A command to toggle the selection state of all files.

4. **Generate Context File**

   - Combine the content of selected files into a single output file.
   - Specify a custom filename via an input box.

---

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Search for **Context Creator**.
4. Click **Install**.

---

## Usage Instructions

### Activating the Extension

- After installation, the extension appears in the Activity Bar as **Context Creator**.
- Click on it to open the file tree view.

### Commands

| Command                                  | Description                                      | How to Use                                         |
| ---------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| `Context Creator: Generate Context File` | Combines selected files into one output file.    | Right-click the view title or use Command Palette. |
| `Context Creator: Toggle All Files`       | Selects or deselects all files in the tree view. | Right-click the view title or use Command Palette. |

### Selecting Files

1. Open the **Files** view under **Context Creator** in the Activity Bar.
2. Click the checkboxes to select or deselect files.
3. Use the **Toggle All Files** command to select/deselect all files at once.

### Generating a File

1. Select the desired files in the **Files** tree view.
2. Run the `Context Creator: Generate Context File` command.
3. Enter a filename (without an extension) in the input box.
4. View the generated `.txt` file in your workspace.

## Configuration

The extension does not currently provide user-configurable settings but supports future extensions for customization.

---

## Key Features in Code

- **Tree View with Checkbox Support**: The `ContextCreatorProvider` class manages the file tree and the checkbox states.
- **State Management**: Tracks checked files and allows toggling of individual or all files.
- **Output Generation**: Combines the contents of selected files and writes them into a user-specified file.

---

## Installation via VSIX

You can download the `.vsix` file from [GitHub Releases](https://github.com/kavanbhavsar35/context-creator/releases) and install it manually:
1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X`).
3. Click the three dots (`...`) in the top-right corner → `Install from VSIX...`.
4. Select the downloaded `.vsix` file.

---

## Future Improvements

- Add user settings for excluding additional directories or file types.
- Allow file preview before generating the output.
- Add multi-workspace support.

---

## Known Issues

- Files in deeply nested directories may take longer to process.
- Large files may impact performance during content concatenation.

---

## Contributing

Contributions are welcome! Submit a pull request or raise an issue on the GitHub repository.

---

## License

This extension is licensed under the [MIT License](LICENSE).

---

## Contact

For questions, suggestions, or issues, contact kvbhavsar35@gmail.com.

