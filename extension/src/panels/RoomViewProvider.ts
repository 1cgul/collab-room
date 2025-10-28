import * as vscode from 'vscode';
import { CollaboratorPresence } from '../types';

type RoomTreeItemContext = 'participant' | 'file' | 'status';

class RoomTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: RoomTreeItemContext,
    options: {
      participant?: CollaboratorPresence;
      filePath?: string;
      tooltip?: string;
      iconId?: string;
    } = {}
  ) {
    super(label, collapsibleState);
    this.participant = options.participant;
    this.filePath = options.filePath;
    this.tooltip = options.tooltip;
    
    if (options.iconId) {
      this.iconPath = new vscode.ThemeIcon(options.iconId);
    }
  }

  readonly participant?: CollaboratorPresence;
  readonly filePath?: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export class RoomViewProvider implements vscode.TreeDataProvider<RoomTreeItem> {
  private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<RoomTreeItem | void>();
  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  private participants: CollaboratorPresence[] = [];
  private connectionState: ConnectionState = 'disconnected';

  constructor() {
    // no-op
  }

  refresh(): void {
    this.onDidChangeTreeDataEmitter.fire();
  }

  setParticipants(participants: CollaboratorPresence[]): void {
    this.participants = participants;
    this.refresh();
  }

  updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.refresh();
  }

  getTreeItem(element: RoomTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: RoomTreeItem): vscode.ProviderResult<RoomTreeItem[]> {
    if (!element) {
      if (!this.participants.length) {
        return [
          new RoomTreeItem(
            this.getStatusLabel(),
            vscode.TreeItemCollapsibleState.None,
            'status',
            { iconId: this.getStatusIcon() }
          )
        ];
      }

      return this.participants.map((participant) => {
        const description = participant.files.length
          ? `${participant.files.length} file${participant.files.length === 1 ? '' : 's'}`
          : 'Idle';
        const tooltipLines = [
          participant.username,
          participant.anonymous ? 'Anonymous mode' : '',
          participant.files.length
            ? `Files: ${participant.files.join(', ')}`
            : 'No local edits detected'
        ].filter(Boolean);

        return new RoomTreeItem(
          participant.isLocal ? `${participant.username} (You)` : participant.username,
          participant.files.length
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None,
          'participant',
          {
            participant,
            tooltip: tooltipLines.join('\n'),
            iconId: participant.isLocal ? 'account' : 'organization',
            filePath: undefined
          }
        );
      });
    }

    if (element.contextValue === 'participant' && element.participant) {
      return element.participant.files.map((filePath) => {
        return new RoomTreeItem(
          filePath,
          vscode.TreeItemCollapsibleState.None,
          'file',
          {
            filePath,
            tooltip: filePath,
            iconId: 'file-text'
          }
        );
      });
    }

    return [];
  }

  private getStatusLabel(): string {
    switch (this.connectionState) {
      case 'connecting':
        return 'Git Room: Connecting...';
      case 'connected':
        return 'Git Room: No collaborators detected yet.';
      default:
        return 'Git Room: Configure room and username to get started.';
    }
  }

  private getStatusIcon(): string {
    switch (this.connectionState) {
      case 'connecting':
        return 'sync~spin';
      case 'connected':
        return 'organization';
      default:
        return 'gear';
    }
  }
}
