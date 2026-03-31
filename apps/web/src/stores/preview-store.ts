"use client";

import { create } from "zustand";
import type {
  GeneratedFile,
  PreviewTab,
  PreviewStore,
} from "@zapp/shared-types";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePreviewStore = create<PreviewStore>((set) => ({
  // --- State ---
  files: [],
  activeTab: "preview",
  activeFileId: null,
  simulationResults: null,
  isPreviewLoading: false,
  previewError: null,

  // --- Actions ---
  setFiles: (files) =>
    set(() => ({
      files,
      activeFileId: files[0]?.id ?? null,
    })),

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
}));
