import * as vscode from 'vscode';
import { getExtensionSettings, watchConfigurationChanges } from './configuration';
import { ChangeTracker } from './services/ChangeTracker';
import { RoomClient } from './services/RoomClient';
import { RoomViewProvider } from './panels/RoomViewProvider';
import { Logger } from './util/logger';
import { ExtensionSettings } from './types';

let logger: Logger | undefined;
let roomClient: RoomClient | undefined;
let changeTracker: ChangeTracker | undefined;
let provider: RoomViewProvider | undefined;
let refreshTimer: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = new Logger('Git Room');
  logger = output;
  context.subscriptions.push({ dispose: () => output.dispose() });

  const initialSettings = getExtensionSettings();
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  changeTracker = new ChangeTracker({
    workspacePath,
    branch: initialSettings.gitBranch,
    logger: output
  });

  provider = new RoomViewProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('gitRoom.roomView', provider)
  );

  const client = new RoomClient(
    {
      serverUrl: initialSettings.serverUrl,
      roomName: initialSettings.roomName,
      username: initialSettings.username,
      anonymousMode: initialSettings.anonymousMode
    },
    output
  );
  roomClient = client;

  const disposeStateListener = client.onDidChangeState((participants) => {
    provider?.setParticipants(participants);
  });
  const disposeConnectionListener = client.onConnectionState((state) => {
    provider?.updateConnectionState(state);
  });

  context.subscriptions.push(
    { dispose: () => disposeStateListener() },
    { dispose: () => disposeConnectionListener() }
  );

  const refreshCommand = vscode.commands.registerCommand('gitRoom.refresh', async () => {
    await refreshState();
  });

  const resetCommand = vscode.commands.registerCommand('gitRoom.resetConnection', () => {
    client.disconnect();
    client.connect();
  });

  context.subscriptions.push(refreshCommand, resetCommand);

  const configurationWatcher = watchConfigurationChanges((newSettings) => {
    onSettingsChanged(newSettings);
  });
  context.subscriptions.push(configurationWatcher);

  const workspaceWatcher = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    const nextWorkspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    changeTracker?.setWorkspacePath(nextWorkspacePath);
  });
  context.subscriptions.push(workspaceWatcher);

  scheduleRefresh(initialSettings.refreshInterval);
  client.connect();
  await refreshState();
}

export function deactivate(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  roomClient?.dispose();
  provider = undefined;
  changeTracker = undefined;
  logger?.dispose();
  logger = undefined;
}

async function refreshState(): Promise<void> {
  if (!changeTracker || !roomClient) {
    return;
  }

  const files = await changeTracker.getChangedFiles();
  await roomClient.publishLocalChanges(files);
}

function onSettingsChanged(settings: ExtensionSettings): void {
  if (!roomClient || !changeTracker) {
    return;
  }

  changeTracker.setBranch(settings.gitBranch);
  roomClient.updateOptions({
    serverUrl: settings.serverUrl,
    roomName: settings.roomName,
    username: settings.username,
    anonymousMode: settings.anonymousMode
  });

  scheduleRefresh(settings.refreshInterval);
}

function scheduleRefresh(intervalSeconds: number): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    refreshState().catch((error) => {
      logger?.error('Failed to refresh Git Room state.', error);
    });
  }, intervalSeconds * 1000);
}
