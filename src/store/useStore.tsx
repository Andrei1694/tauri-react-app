import { create } from "zustand";

export interface DocFile {
  title: string;
  path: string;
}

interface State {
  selectedFile: DocFile | null;
  setSelectedFile: (selectedFile: DocFile | null) => void;
  files: DocFile[];
  setFiles: (files: DocFile[]) => void;
}

const useStore = create<State>((set) => ({
  selectedFile: null,
  files: [],
  setSelectedFile: (file) => set({ selectedFile: file }),
  setFiles: (files) => set({ files }),
}));

export default useStore;

