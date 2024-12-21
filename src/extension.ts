// src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

class FileItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly filePath: string,
		public isChecked: boolean = false
	) {
		super(label, collapsibleState);
		this.contextValue = 'fileItem';
		// Use VS Code's native checkbox state
		this.checkboxState = {
			state: isChecked ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked
		};
	}

	updateCheckState(checked: boolean) {
		this.isChecked = checked;
		this.checkboxState = {
			state: checked ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked
		};
	}
}

class ContextCreatorProvider implements vscode.TreeDataProvider<FileItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

	private items: Map<string, FileItem> = new Map();

	private allChecked = false; // Track global check state
	
	constructor(private workspaceRoot: string | undefined) { }


    async toggleAllFiles() {
        this.allChecked = !this.allChecked;
        
        // Toggle all items
        for (const [_, item] of this.items) {
            item.updateCheckState(this.allChecked);
        }
        
        this.refresh();
        
        // Show status message
        vscode.window.showInformationMessage(
            this.allChecked ? 'All files selected' : 'All files deselected'
        );
    }

	// Add a method to save state
    private saveState() {
        const state: Record<string, boolean> = {};
        this.items.forEach((item, path) => {
            state[path] = item.isChecked;
        });
        console.log('Saving state:', state); // Debug line
    }

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: FileItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: FileItem): Promise<FileItem[]> {
		if (!this.workspaceRoot) {
			return Promise.resolve([]);
		}

		if (element) {
			const dirPath = element.filePath;
			return this.getFilesInDirectory(dirPath);
		}

		return this.getFilesInDirectory(this.workspaceRoot);
	}

	private async getFilesInDirectory(dirPath: string): Promise<FileItem[]> {
		const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
		const items: FileItem[] = [];

		for (const entry of entries) {
			const filePath = path.join(dirPath, entry.name);

			// Skip node_modules and .git directories
			if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git')) {
				continue;
			}

			if (entry.isDirectory()) {
				const item = new FileItem(
					entry.name,
					vscode.TreeItemCollapsibleState.Collapsed,
					filePath,
					this.items.get(filePath)?.isChecked ?? false
				);
				this.items.set(filePath, item);
				items.push(item);
			} else {
				const item = new FileItem(
					entry.name,
					vscode.TreeItemCollapsibleState.None,
					filePath,
					this.items.get(filePath)?.isChecked ?? false
				);
				this.items.set(filePath, item);
				items.push(item);
			}
		}

		return items;
	}

	toggleCheck(item: FileItem) {
		// console.log(item);
		const newState = !item.isChecked;
		console.log(`Toggling check for ${item.filePath}: ${item.isChecked} -> ${newState}`); // Add this debug line
		item.updateCheckState(newState);
		this.refresh();
		this.saveState(); // Save after each toggle

		if (item.collapsibleState !== vscode.TreeItemCollapsibleState.None) {
			this.toggleDirectoryChildren(item.filePath, newState);
		}
	}

	private async toggleDirectoryChildren(dirPath: string, checked: boolean) {
		const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.name === 'node_modules' || entry.name === '.git') {
				continue;
			}

			const filePath = path.join(dirPath, entry.name);
			const item = this.items.get(filePath);

			if (item) {
				item.updateCheckState(checked);
			}

			if (entry.isDirectory()) {
				await this.toggleDirectoryChildren(filePath, checked);
			}
		}
	}

	getCheckedFiles(): string[] {
		const checkedFiles: string[] = [];
		for (const [path, item] of this.items) {
			console.log(`Checking item: ${path}, isChecked: ${item.isChecked}`); // Add this debug line
			if (item.isChecked && item.collapsibleState === vscode.TreeItemCollapsibleState.None) {
				checkedFiles.push(path);
			}
		}
		console.log(`Total checked files found: ${checkedFiles.length}`); // Add this debug line
		return checkedFiles;
	}

	async generateFile(): Promise<void> {
        const checkedFiles = this.getCheckedFiles();
        
        if (checkedFiles.length === 0) {
            vscode.window.showWarningMessage('No files selected!');
            return;
        }

        // Show input box for filename
        const fileName = await vscode.window.showInputBox({
            prompt: 'Enter the file name (without extension)',
            placeHolder: 'output',
            validateInput: (value) => {
                if (!value) {
                    return 'File name is required';
                }
                if (value.includes('.')) {
                    return 'Please enter name without extension';
                }
                return null;
            }
        });

        if (!fileName) {
            return;
        }

        const outputPath = path.join(this.workspaceRoot!, `${fileName}.txt`);
        
        try {
            let output = '';
            for (const file of checkedFiles) {
                const content = await fs.promises.readFile(file, 'utf8');
                output += `// File: ${path.relative(this.workspaceRoot!, file)}\n`;
                output += content;
                output += '\n\n';
            }

            await fs.promises.writeFile(outputPath, output);
            
            // Show success message with option to open file
            const action = await vscode.window.showInformationMessage(
                `Generated file: ${fileName}.txt`,
                'Open File'
            );
            
            if (action === 'Open File') {
                const doc = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(doc);
            }
        } catch (error: Error | any) {
            vscode.window.showErrorMessage(`Error generating file: ${error.message}`);
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
	const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
	const contextCreatorProvider = new ContextCreatorProvider(rootPath);

	const treeView = vscode.window.createTreeView('contextCreatorView', {
        treeDataProvider: contextCreatorProvider,
        canSelectMany: true    // Allow multiple selections
    });
	// Register click handler for tree items
	// Handle checkbox changes
    context.subscriptions.push(
        treeView.onDidChangeCheckboxState((event) => {
            // event.items is a Map of TreeItem -> boolean
            for (const [item, checked] of event.items) {
                contextCreatorProvider.toggleCheck(item as FileItem);
            }
        })
    );

	// Register checkbox change handler
	context.subscriptions.push(
		vscode.commands.registerCommand('fileCollector.checkboxChanged', (item: FileItem, checked: boolean) => {
			contextCreatorProvider.toggleCheck(item);
		})
	);
	// Register generate file command
	context.subscriptions.push(
		vscode.commands.registerCommand('contextCreator.generateFile', () => {
            contextCreatorProvider.generateFile();
        })
	);

	// Register toggle all files command
    context.subscriptions.push(
        vscode.commands.registerCommand('contextCreator.toggleAllFiles', () => {
            contextCreatorProvider.toggleAllFiles();
        })
    );
}

export function deactivate() { }