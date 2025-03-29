// src/commands.ts
import * as vscode from 'vscode';
import { ContextCreatorProvider } from './providers/ContextCreatorProvider';
import { FileItem } from './models/FileItem';

export function registerCommands(
  context: vscode.ExtensionContext,
  provider: ContextCreatorProvider,
  treeView: vscode.TreeView<FileItem>
) {
  context.subscriptions.push(
    treeView.onDidChangeCheckboxState(evt => {
      for (const [item] of evt.items) {
        provider.toggleCheck(item);
      }
    }),

    vscode.commands.registerCommand('contextCreator.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('contextCreator.generateFile', () => provider.generateFile()),
    vscode.commands.registerCommand('contextCreator.toggleAllFiles', () => provider.toggleAllFiles()),
    vscode.commands.registerCommand('contextCreator.checkboxChanged', (item) => {
      provider.toggleCheck(item);
    }),
    vscode.commands.registerCommand('contextCreator.searchFiles', () => provider.searchFiles()),

    vscode.workspace.onDidChangeConfiguration(evt => {
      if (evt.affectsConfiguration('contextCreator')) {
        vscode.window.showInformationMessage(
          'Configuration updated. Please reload VS Code for changes to take effect.', 
          'Reload'
        ).then(selection => {
          if (selection === 'Reload') {
            vscode.commands.executeCommand('workbench.action.reloadWindow');
          }
        });
      }
    })
  );
}
