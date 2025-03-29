// src/providers/ContextCreatorProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FileItem } from '../models/FileItem';

export class ContextCreatorProvider implements vscode.TreeDataProvider<FileItem> {
    // Tree Data Provider Implementation
    private _onDidChangeTreeData = new vscode.EventEmitter<FileItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | void> = this._onDidChangeTreeData.event;

    // State Management
    private items = new Map<string, FileItem>();
    private manuallyUncheckedFiles = new Set<string>(); // Tracks files manually unchecked by user
    private excludedPatterns: string[] = [];
    private persistState: boolean = true;
    private maxFileSizeWarningKB: number = 500;
    private searchPattern: string = '';

    // Output Configuration
    private outputFormat = {
        fileHeaderFormat: '// File: {filePath}',
        fileSeparator: '\n\n',
        extension: 'txt'
    };

    constructor(
        private workspaceRoot: string,
        private context: vscode.ExtensionContext
    ) {
        this.loadConfig();
        this.loadPersistedState();
    }

    // ======================
    // TreeDataProvider Methods
    // ======================

    getTreeItem(element: FileItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: FileItem): Promise<FileItem[]> {
        if (element) {
            return this.getDirectoryItems(element.filePath);
        }
        return this.getDirectoryItems(this.workspaceRoot);
    }

    // ======================
    // Public Methods
    // ======================

    refresh(): void {
        this.items.clear();
        this.loadPersistedState();
        this._onDidChangeTreeData.fire();
    }

    setSearchPattern(pattern: string): void {
        this.searchPattern = pattern;
        this.refresh();
    }

    async toggleAllFiles(): Promise<void> {
        const allChecked = Array.from(this.items.values()).every(item => item.isChecked);
        const newState = !allChecked;

        for (const [path, item] of this.items) {
            item.updateCheckState(newState);
        }

        if (this.persistState) {
            this.savePersistedState();
        }
        this.refresh();
    }

    async toggleCheck(item: FileItem, forcedState?: boolean): Promise<void> {
        // Determine new state
        const newState = forcedState !== undefined ? forcedState : !item.isChecked;

        // Track manual user actions
        if (forcedState === undefined) {
            if (newState === false) {
                this.manuallyUncheckedFiles.add(item.filePath);
            } else {
                this.manuallyUncheckedFiles.delete(item.filePath);
            }
        }

        // Handle file size warnings for selected files
        if (newState && item.contextValue === 'file') {
            try {
                await this.checkFileSize(item.filePath);
            } catch (error) {
                if (error instanceof Error && error.message === 'User cancelled large file selection') {
                    item.updateCheckState(false);
                    this.savePersistedState();
                    this.refresh();
                    return;
                }
            }
        }

        // Uncheck parent when unchecking a file
        if (!newState) {
            const parentFolder = this.getParentFolderItem(item);
            parentFolder.updateCheckState(false);
        }

        // Update the item state
        item.updateCheckState(newState);

        // Handle directory children recursively
        if (item.contextValue === 'folder') {
            await this.toggleDirectoryChildren(item.filePath, newState);
        }

        this.savePersistedState();
        this.refresh();
    }

    getCheckedFiles(): string[] {
        return Array.from(this.items.values())
            .filter(item => item.isChecked && item.contextValue === 'file')
            .map(item => item.filePath);
    }

    async searchFiles(): Promise<void> {
        const searchPattern = await vscode.window.showInputBox({
            prompt: 'Enter search pattern',
            placeHolder: 'e.g., .js, component, etc.',
        });

        if (searchPattern !== undefined) {
            this.setSearchPattern(searchPattern);
        }
    }

    async generateFile(): Promise<void> {
        const checkedFiles = this.getCheckedFiles();
        if (checkedFiles.length === 0) {
            vscode.window.showWarningMessage('No files selected!');
            return;
        }

        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter output file name (without extension)',
            placeHolder: 'context',
            validateInput: value => value?.includes('.') ? 'No extensions allowed' : null
        }) || 'context';

        try {
            const outputPath = path.join(this.workspaceRoot, `${fileName}.${this.outputFormat.extension}`);
            const contents = await Promise.all(
                checkedFiles.map(async file => ({
                    path: path.relative(this.workspaceRoot, file),
                    content: await fs.promises.readFile(file, 'utf8')
                }))
            );

            await fs.promises.writeFile(
                outputPath,
                contents.map(({ path, content }) =>
                    this.outputFormat.fileHeaderFormat.replace('{filePath}', path) +
                    '\n' +
                    content
                ).join(this.outputFormat.fileSeparator)
            );

            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating file: ${error instanceof Error ? error.message : error}`);
        }
    }

    // ======================
    // Private Helper Methods
    // ======================

    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('contextCreator');
        this.excludedPatterns = config.get<string[]>('exclude', ['node_modules', '.git']);
        this.persistState = config.get<boolean>('persistState', true);
        this.maxFileSizeWarningKB = config.get<number>('maxFileSizeWarningKB', 500);

        const outputFormat = config.get<any>('outputFormat', {});
        this.outputFormat = {
            fileHeaderFormat: outputFormat.fileHeaderFormat || '// File: {filePath}',
            fileSeparator: outputFormat.fileSeparator || '\n\n',
            extension: outputFormat.extension || 'txt'
        };
    }

    private loadPersistedState(): void {
        if (!this.persistState) {return;}

        const state = this.context.workspaceState.get<Record<string, boolean>>('fileStates');
        if (state) {
            for (const [filePath, isChecked] of Object.entries(state)) {
                if (fs.existsSync(filePath)) {
                    this.items.set(filePath, new FileItem(
                        path.basename(filePath),
                        fs.statSync(filePath).isDirectory()
                            ? vscode.TreeItemCollapsibleState.Collapsed
                            : vscode.TreeItemCollapsibleState.None,
                        filePath,
                        isChecked
                    ));
                }
            }
        }
    }

    private savePersistedState(): void {
        if (!this.persistState) {return;}

        const state: Record<string, boolean> = {};
        this.items.forEach((item, path) => state[path] = item.isChecked);
        this.context.workspaceState.update('fileStates', state);
    }

    private async getDirectoryItems(dirPath: string): Promise<FileItem[]> {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
            const result = await Promise.all(
                entries
                    .filter(entry => !this.excludedPatterns.includes(entry.name))
                    .filter(entry => {
                        if (!this.searchPattern) {return true;}
                        return entry.name.toLowerCase().includes(this.searchPattern.toLowerCase());
                    })
                    .map(async entry => {
                        const filePath = path.join(dirPath, entry.name);
                        const isDirectory = entry.isDirectory();

                        let item = this.items.get(filePath);
                        if (!item) {
                            item = new FileItem(
                                entry.name,
                                isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                                filePath,
                                this.items.get(filePath)?.isChecked ?? false
                            );
                            this.items.set(filePath, item);
                        }
                        return item;
                    })
            );

            return result;
        } catch (error) {
            vscode.window.showErrorMessage(`Error reading directory: ${dirPath}`);
            return [];
        }
    }

    private async checkFileSize(filePath: string): Promise<void> {
        try {
            const stats = await fs.promises.stat(filePath);
            const fileSizeKB = stats.size / 1024;

            if (fileSizeKB > this.maxFileSizeWarningKB) {
                const proceed = await vscode.window.showWarningMessage(
                    `File "${path.basename(filePath)}" is ${Math.round(fileSizeKB)}KB, which exceeds the warning threshold (${this.maxFileSizeWarningKB}KB).`,
                    'Select Anyway',
                    'Cancel'
                );

                if (proceed !== 'Select Anyway') {
                    throw new Error('User cancelled large file selection');
                }
            }
        } catch (error) {
            if (error instanceof Error && error.message === 'User cancelled large file selection') {
                throw error;
            }
            // Silently ignore other errors
        }
    }

    private async toggleDirectoryChildren(dirPath: string, state: boolean): Promise<void> {
        try {
            const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                if (this.excludedPatterns.includes(entry.name)) {
                    continue;
                }

                const filePath = path.join(dirPath, entry.name);
                
                // Skip manually unchecked files when checking
                if (state && this.manuallyUncheckedFiles.has(filePath)) {
                    continue;
                }

                let item = this.items.get(filePath);
                if (!item) {
                    item = new FileItem(
                        entry.name,
                        entry.isDirectory() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
                        filePath,
                        state
                    );
                    this.items.set(filePath, item);
                }

                await this.toggleCheck(item, state);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error processing directory: ${error instanceof Error ? error.message : error}`);
        }
    }

    private getParentFolderItem(item: FileItem): FileItem {
        const parentFolderPath = path.dirname(item.filePath);
        const parentFolderName = path.basename(parentFolderPath);
        return this.items.get(parentFolderPath) ||
            new FileItem(parentFolderName, vscode.TreeItemCollapsibleState.Collapsed, parentFolderPath, false);
    }
}