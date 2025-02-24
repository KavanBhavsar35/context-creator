# Change Log

All notable changes to the "context-creator" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.2] - 2025-02-24

### Added
- **File Icons**: Added icons for files and folders based on file type.
- **Search Functionality**: New search feature to filter files by name.
- **File Size Warning**: Warning when selecting large files that may impact performance.
- **Output Customization**: User-configurable output format including header format, file separator, and extension.
- **State Persistence**: Save and restore checkbox states between sessions.
- **Configurable Exclusions**: Add settings to exclude specific directories or file patterns.
- **Improved Error Handling**: Better error messages and validation for file operations.
- **Recursive Directory Handling**: Properly handle nested directories and files.
- **Enhanced UI**: Better distinction between files and folders in the tree view.
- **Refresh Button**: Added dedicated refresh button in the view title bar.
- **Command Consistency**: Fixed command references in UI and code.

### Fixed
- **Directory Selection Issue**: Fixed the issue where selecting a directory didn't include its nested files.
- **Empty Filename Validation**: Improved validation for empty filenames during file generation.
- **Performance Improvements**: Optimized file processing for large directories.
- **Command Registration**: Fixed incorrect command references.

### Changed
- **Code Refactoring**: Separated code into modular files for better maintainability.
- **Settings Integration**: Added configuration options for persistence and exclusions.
- **Icon Improvements**: Better icons for each command function.

---

## [0.0.1] - Initial Release

- **Tree View**: Display workspace files with checkbox support.
- **File Selection**: Toggle individual or all files.
- **Context File Generation**: Combine selected files into a single output file.