// ---------------------------------------------------------------------------
// @zapp/shared-types — Preview panel type contracts
// ---------------------------------------------------------------------------

import type { GeneratedArtifact } from './chat';

export interface GeneratedFile {
  id: string;
  filename: string;
  language: 'solidity' | 'typescript' | 'tsx';
  content: string;
  version: number;
  previousContent?: string;
}

export type PreviewTab = 'preview' | 'code' | 'simulation';

export interface PreviewState {
  files: GeneratedFile[];
  activeTab: PreviewTab;
  activeFileId: string | null;
  simulationResults: unknown | null;
  isPreviewLoading: boolean;
  previewError: string | null;
}

export interface PreviewActions {
  setFiles: (files: GeneratedFile[]) => void;
  updateFile: (id: string, content: string) => void;
  addFile: (file: GeneratedFile) => void;
  setActiveTab: (tab: PreviewTab) => void;
  setActiveFile: (id: string) => void;
  setSimulationResults: (results: unknown) => void;
  setPreviewLoading: (loading: boolean) => void;
  setPreviewError: (error: string | null) => void;
}

export type PreviewStore = PreviewState & PreviewActions;

/** Convert a GeneratedArtifact (from chat stream) to a GeneratedFile (for preview store) */
export function artifactToFile(artifact: GeneratedArtifact): GeneratedFile {
  return {
    id: artifact.id,
    filename: artifact.filename,
    language: artifact.language,
    content: artifact.code,
    version: artifact.version,
  };
}
