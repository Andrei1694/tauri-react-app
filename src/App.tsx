import "./App.css";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css"; // Changed to dark theme
import "./App.css";
import SnippetForm from "./components/SnippetForm";
import SnippetList from "./components/SnippetList";
import Sidebar from "./components/Sidebar/Sidebar";
import Markdown from "react-markdown";
import MarkdownReader from "./components/Markdown/MarkdownReader";
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
    {
      title: "Home",
      content: "Home content",
    },
    {
      title: "About",
      content: "About content",
    },
    {
      title: "Contact",
      content: "Contact content",
    },
    {
      title: "Services",
      content: "Services content",
    },
  ];
  const [windowVisible, setWindowVisible] = useState(false); // Track window visibility
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [files, setFiles] = useState<any[]>([]);

  const setSelectedPageHandler = (page: Page) => {
	setSelectedPage(page);
	  }

  useEffect(() => {
    console.log(windowVisible);
    shortcuts();
    hljs.highlightAll();
	// loadFiles();
  }, []);

  const loadFiles = async() => {
	let files = []
	const res = await fetch("/markdown-files/files.json") // Make sure this path is correct
	const text = await res.text()
	files = JSON.parse(text)
	//   .then((res) => res.text())
	//   .then((text) => {files = JSON.parse(text)})
	//   .catch((err) => console.error("Error loading Markdown:", err));
	  console.log(files)
	  setFiles(files)
  }

  const getTitles = () => {
	  const f = files.map((file) => file.title)
	  console.log(f)
	  return f
  }

  const addSnippet = (newSnippet: Omit<Snippet, "id">) => {
    setSnippets([...snippets, { ...newSnippet, id: Date.now() }]);
  };

  const deleteSnippet = (id: number) => {
    setSnippets(snippets.filter((snippet) => snippet.id !== id));
  };

  // Function to register the shortcut
  async function shortcuts() {
    await register("CommandOrControl+Shift+C", pressEventHandler);
  }



  const pressEventHandler = async (e: any) => {
    try {
      const window = await getCurrentWindow(); // Make sure this returns the correct window object
      if (!window) {
        console.error("Window not found");
        return;
      }

      const isVisible = await window.isVisible();
      console.log("Window visibility:", isVisible);

      if (e.state === "Pressed") {
        console.log("Button Pressed");
        if (isVisible) {
          // Hide window if it's visible
          await window.hide();
          console.log("Window is now hidden");
          setWindowVisible(false); // Update visibility state
        } else {
          // Show window if it's hidden
          await window.show();
          console.log("Window is now visible");
          setWindowVisible(true); // Update visibility state
        }
      }
    } catch (error) {
      console.error("Error handling press event:", error);
    }
  };


  return (
    <div className="app">
      <h1>Code Snippet Repository</h1>
      {/* <SnippetForm addSnippet={addSnippet} />
      <SnippetList snippets={snippets} deleteSnippet={deleteSnippet} /> */}
      <div className="container">
        <Sidebar pages={pages} setSelectedPageHandler={setSelectedPageHandler} selectedPage={selectedPage} />
        <div>
			<MarkdownReader />
			</div>
      </div>
    </div>
  );
}

export default App;
