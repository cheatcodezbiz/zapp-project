"use client";

import { create } from "zustand";
import type {
  GeneratedFile,
  PreviewTab,
  PreviewStore,
  ViewportMode,
} from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePreviewStore = create<PreviewStore & {
  preloadedForProject: string | null;
  setPreloadedForProject: (projectId: string | null) => void;
}>((set) => ({
  // --- State ---
  files: [],
  activeTab: "preview",
  activeFileId: null,
  simulationResults: null,
  isPreviewLoading: false,
  previewError: null,
  viewportMode: "desktop" as ViewportMode,
  preloadedForProject: null,

  // --- Actions ---
  setFiles: (files) =>
    set(() => ({
      files,
      activeFileId: files[0]?.id ?? null,
    })),

  setPreloadedForProject: (projectId) =>
    set(() => ({ preloadedForProject: projectId })),

  updateFile: (id, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? {
              ...f,
              previousContent: f.content,
              content,
              version: f.version + 1,
            }
          : f,
      ),
    })),

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
      activeFileId: state.activeFileId ?? file.id,
    })),

  setActiveTab: (tab) => set(() => ({ activeTab: tab })),

  setActiveFile: (id) => set(() => ({ activeFileId: id })),

  setSimulationResults: (results) =>
    set(() => ({ simulationResults: results })),

  setPreviewLoading: (loading) => set(() => ({ isPreviewLoading: loading })),

  setPreviewError: (error) => set(() => ({ previewError: error })),

  setViewportMode: (mode) => set(() => ({ viewportMode: mode })),
}));
