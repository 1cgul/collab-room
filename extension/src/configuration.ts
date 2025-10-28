import * as vscode from 'vscode';
import { ExtensionSettings } from './types';

const CONFIG_NAMESPACE = 'gitRoom';

export function getExtensionSettings(): ExtensionSettings {
  const configuration = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

  return {
    roomName: configuration.get<string>('roomName', '').trim(),
    username: configuration.get<string>('username', '').trim(),
    serverUrl: configuration.get<string>('serverUrl', 'http://localhost:4100'),
    refreshInterval: Math.max(
      10,
      Math.min(300, configuration.get<number>('refreshInterval', 30))
    ),
    gitBranch: configuration.get<string>('gitBranch', 'main'),
    anonymousMode: configuration.get<boolean>('anonymousMode', false)
  };
}

export function watchConfigurationChanges(
  listener: (settings: ExtensionSettings) => void
): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
      listener(getExtensionSettings());
    }
  });
}
