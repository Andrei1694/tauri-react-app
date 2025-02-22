import "./App.css";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Changed to dark theme
import SnippetForm from "./components/SnippetForm";
import SnippetList from "./components/SnippetList";
import Sidebar from "./components/Sidebar/Sidebar";
import MarkdownReader from "./components/Markdown/MarkdownReader";
import useStore from "./store/useStore";

export interface Page {
  title: string;
  content?: string;
}

interface Snippet {
  id: number;
  title: string;
  code: string;
  language: string;
}

function App() {
  const pages = [
    { title: "Home", content: "Home content" },
    { title: "About", content: "About content" },
    { title: "Contact", content: "Contact content" },
    { title: "Services", content: "Services content" },
  ];

  const [windowVisible, setWindowVisible] = useState(false);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState("");
  const { selectedFile } = useStore();
  const [files, setFiles] = useState([
    { title: "Docker Guide", path: "/markdown-files/dock.md" },
    { title: "Example File", path: "/markdown-files/ceva.md" },
  ]);

  const setSelectedPageHandler = (page: Page) => {
    setSelectedPage(page);
    const file = files.find((f) => f.title === page.title);
    if (file) loadMarkdown(file.path);
  };

  useEffect(() => {
    console.log(windowVisible);
    shortcuts();
    hljs.highlightAll();
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const res = await fetch("/markdown-files/files.json");
      if (!res.ok) throw new Error("Failed to load files.json");

      const fileList = await res.json();
      console.log("Loaded files:", fileList);
      setFiles(fileList);
    } catch (err) {
      console.error("Error loading Markdown file list:", err);
    }
  };

  const loadMarkdown = async (filePath: string) => {
    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error(`Failed to load ${filePath}`);

      const markdownText = await res.text();
      setSelectedFileContent(markdownText);
    } catch (err) {
      console.error("Error loading Markdown content:", err);
    }
  };

  const addSnippet = (newSnippet: Omit<Snippet, "id">) => {
    setSnippets([...snippets, { ...newSnippet, id: Date.now() }]);
  };

  const deleteSnippet = (id: number) => {
    setSnippets(snippets.filter((snippet) => snippet.id !== id));
  };

  async function shortcuts() {
    await register("CommandOrControl+Shift+C", pressEventHandler);
  }

  const pressEventHandler = async (e: any) => {
    try {
      const window = await getCurrentWindow();
      if (!window) {
        console.error("Window not found");
        return;
      }

      const isVisible = await window.isVisible();
      console.log("Window visibility:", isVisible);

      if (e.state === "Pressed") {
        console.log("Button Pressed");
        if (isVisible) {
          await window.hide();
          console.log("Window is now hidden");
          setWindowVisible(false);
        } else {
          await window.show();
          console.log("Window is now visible");
          setWindowVisible(true);
        }
      }
    } catch (error) {
      console.error("Error handling press event:", error);
    }
  };

  return (
    <div className="app">
      <h1>Code Snippet Repository</h1>
      <div className="container">
        <Sidebar pages={pages} setSelectedPageHandler={setSelectedPageHandler} selectedPage={selectedPage} />
        <div className="content">
          <MarkdownReader markdown={selectedFile} />
        </div>
      </div>
    </div>
  );
}

export default App;
