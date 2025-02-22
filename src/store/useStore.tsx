import { create } from "zustand";

interface State {
  selectedFile: { title: string; path: string };
  setSelectedFile: (selectedFile: {title:string, path: string}) => void;
  files: { title: string; path: string }[];
  setFiles: (files: { title: string; path: string }[]) => void;
}

const useStore = create<State>((set) => ({
  selectedFile: { title: "", path: "" },
  files: [
    {
      title: "Docker Guide",
      path: "/markdown-files/dock.md",
    },
    {
      title: "Ceva",
      path: "/markdown-files/ceva.md",
    },
  ],
  setSelectedFile: (file) => set({ selectedFile: file }),
  setFiles: (files) => set({ files }),
}));

export default useStore;
