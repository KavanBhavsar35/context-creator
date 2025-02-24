// src/extension.ts
import * as vscode from 'vscode';
import { ContextCreatorProvider } from './providers/ContextCreatorProvider';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rootPath) {
        vscode.window.showErrorMessage('No workspace open');
        return;
    }

    const provider = new ContextCreatorProvider(rootPath, context);
    const treeView = vscode.window.createTreeView('contextCreatorView', {
        treeDataProvider: provider,
        canSelectMany: true
    });

    registerCommands(context, provider, treeView);
}

export function deactivate() {}