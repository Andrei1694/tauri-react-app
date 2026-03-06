import "./App.css";
import { isTauri } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregister, type ShortcutEvent } from "@tauri-apps/plugin-global-shortcut";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PRIMARY_WINDOW_SHORTCUT = "CommandOrControl+Space";
const FALLBACK_WINDOW_SHORTCUT = "CommandOrControl+Shift+C";
const RECENTS_STORAGE_KEY = "spotlight.recents.v1";
const LAST_QUERY_STORAGE_KEY = "spotlight.lastQuery";
const MAX_RECENTS = 12;
const EMPTY_QUERY_RESULT_LIMIT = 12;

type DocManifestEntry = {
  title?: unknown;
  name?: unknown;
  path?: unknown;
};

type CommandManifestEntry = {
  id?: unknown;
  title?: unknown;
  command?: unknown;
  description?: unknown;
  tags?: unknown;
  aliases?: unknown;
  suggested?: unknown;
};

interface DocItem {
  type: "document";
  id: string;
  title: string;
  path: string;
  searchText: string;
}

interface CommandItem {
  type: "command";
  id: string;
  title: string;
  command: string;
  description: string;
  tags: string[];
  aliases: string[];
  suggested: boolean;
  searchText: string;
}

type SearchResult = DocItem | CommandItem;

interface RecentEntry {
  id: string;
  type: SearchResult["type"];
  timestamp: number;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getShortcutLabel(shortcut: string): string {
  if (shortcut === PRIMARY_WINDOW_SHORTCUT) {
    return "Cmd/Ctrl + Space";
  }

  if (shortcut === FALLBACK_WINDOW_SHORTCUT) {
    return "Cmd/Ctrl + Shift + C";
  }

  return shortcut;
}

function makeItemKey(item: Pick<SearchResult, "id" | "type">): string {
  return `${item.type}:${item.id}`;
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeDocManifest(payload: unknown): DocItem[] {
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { files?: unknown }).files)
      ? (payload as { files: unknown[] }).files
      : [];

  return entries
    .map((entry): DocItem | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const manifestEntry = entry as DocManifestEntry;
      const title =
        typeof manifestEntry.title === "string"
          ? manifestEntry.title
          : typeof manifestEntry.name === "string"
            ? manifestEntry.name
            : null;
      const path = typeof manifestEntry.path === "string" ? manifestEntry.path : null;

      if (!title || !path) {
        return null;
      }

      const normalizedTitle = title.trim();
      const normalizedPath = path.trim();

      if (!normalizedTitle || !normalizedPath) {
        return null;
      }

      return {
        type: "document",
        id: normalizedPath,
        title: normalizedTitle,
        path: normalizedPath,
        searchText: normalizeText(`${normalizedTitle} ${normalizedPath}`),
      };
    })
    .filter((entry): entry is DocItem => Boolean(entry));
}

function normalizeCommandManifest(payload: unknown): CommandItem[] {
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { commands?: unknown }).commands)
      ? (payload as { commands: unknown[] }).commands
      : [];

  return entries
    .map((entry): CommandItem | null => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const manifestEntry = entry as CommandManifestEntry;
      const title = typeof manifestEntry.title === "string" ? manifestEntry.title.trim() : "";
      const command = typeof manifestEntry.command === "string" ? manifestEntry.command.trim() : "";

      if (!title || !command) {
        return null;
      }

      const tags = Array.isArray(manifestEntry.tags)
        ? manifestEntry.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim())
        : [];
      const aliases = Array.isArray(manifestEntry.aliases)
        ? manifestEntry.aliases
            .filter((alias): alias is string => typeof alias === "string")
            .map((alias) => alias.trim())
        : [];
      const description = typeof manifestEntry.description === "string" ? manifestEntry.description.trim() : "";
      const suggested = manifestEntry.suggested === true;
      const idCandidate = typeof manifestEntry.id === "string" ? manifestEntry.id.trim() : "";

      const id = idCandidate || toSlug(title) || toSlug(command);

      return {
        type: "command",
        id,
        title,
        command,
        description,
        tags,
        aliases,
        suggested,
        searchText: normalizeText(`${title} ${description} ${command} ${tags.join(" ")} ${aliases.join(" ")}`),
      };
    })
    .filter((entry): entry is CommandItem => Boolean(entry));
}

function readLastQuery(): string {
  try {
    const stored = window.localStorage.getItem(LAST_QUERY_STORAGE_KEY);
    return typeof stored === "string" ? stored : "";
  } catch {
    return "";
  }
}

function readRecents(): RecentEntry[] {
  try {
    const stored = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry): RecentEntry | null => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const candidate = entry as { id?: unknown; type?: unknown; timestamp?: unknown };
        if (
          typeof candidate.id !== "string" ||
          (candidate.type !== "document" && candidate.type !== "command") ||
          typeof candidate.timestamp !== "number" ||
          !Number.isFinite(candidate.timestamp)
        ) {
          return null;
        }

        return {
          id: candidate.id,
          type: candidate.type,
          timestamp: candidate.timestamp,
        };
      })
      .filter((entry): entry is RecentEntry => Boolean(entry))
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

function scoreMatch(item: SearchResult, normalizedQuery: string, tokens: string[]): number {
  const normalizedTitle = normalizeText(item.title);
  if (!tokens.every((token) => item.searchText.includes(token))) {
    return -1;
  }

  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 180;
  }
  if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 120;
  }
  if (normalizedTitle.includes(normalizedQuery)) {
    score += 70;
  }
  if (item.searchText.includes(normalizedQuery)) {
    score += 25;
  }

  for (const token of tokens) {
    score += normalizedTitle.includes(token) ? 18 : 9;
  }

  return score;
}

function getDefaultResults(
  commands: CommandItem[],
  documents: DocItem[],
  recents: RecentEntry[],
  itemByKey: Map<string, SearchResult>,
): SearchResult[] {
  const uniqueKeys = new Set<string>();
  const result: SearchResult[] = [];

  for (const entry of recents) {
    const recentItem = itemByKey.get(makeItemKey(entry));
    if (!recentItem) {
      continue;
    }

    const recentKey = makeItemKey(recentItem);
    if (uniqueKeys.has(recentKey)) {
      continue;
    }

    uniqueKeys.add(recentKey);
    result.push(recentItem);

    if (result.length >= EMPTY_QUERY_RESULT_LIMIT) {
      return result;
    }
  }

  for (const command of commands.filter((item) => item.suggested)) {
    const commandKey = makeItemKey(command);
    if (uniqueKeys.has(commandKey)) {
      continue;
    }

    uniqueKeys.add(commandKey);
    result.push(command);

    if (result.length >= EMPTY_QUERY_RESULT_LIMIT) {
      return result;
    }
  }

  for (const document of documents) {
    const documentKey = makeItemKey(document);
    if (uniqueKeys.has(documentKey)) {
      continue;
    }

    uniqueKeys.add(documentKey);
    result.push(document);

    if (result.length >= EMPTY_QUERY_RESULT_LIMIT) {
      break;
    }
  }

  return result;
}

function App() {
  const tauriRuntimeAvailable = useMemo(() => isTauri(), []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [query, setQuery] = useState(() => readLastQuery());
  const [recents, setRecents] = useState<RecentEntry[]>(() => readRecents());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocItem | null>(null);
  const [previewContent, setPreviewContent] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [windowVisible, setWindowVisible] = useState(true);
  const windowVisibleRef = useRef(true);
  const [shortcutLabel, setShortcutLabel] = useState(getShortcutLabel(PRIMARY_WINDOW_SHORTCUT));
  const [manifestError, setManifestError] = useState<string | null>(null);

  const resultsContainerId = "spotlight-results";

  const syncWindowToPanelBounds = useCallback(async () => {
    if (!tauriRuntimeAvailable) {
      return;
    }

    const panelElement = panelRef.current;
    const rootElement = panelElement?.parentElement;

    if (!panelElement || !rootElement) {
      return;
    }

    const rootStyles = window.getComputedStyle(rootElement);
    const horizontalPadding =
      Number.parseFloat(rootStyles.paddingLeft || "0") + Number.parseFloat(rootStyles.paddingRight || "0");
    const verticalPadding =
      Number.parseFloat(rootStyles.paddingTop || "0") + Number.parseFloat(rootStyles.paddingBottom || "0");

    const panelRect = panelElement.getBoundingClientRect();
    const targetWidth = Math.ceil(panelRect.width + horizontalPadding);
    const targetHeight = Math.ceil(panelRect.height + verticalPadding);

    if (!Number.isFinite(targetWidth) || !Number.isFinite(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
      return;
    }

    try {
      const currentWindow = getCurrentWindow();
      await currentWindow.setSize(new LogicalSize(targetWidth, targetHeight));
      await currentWindow.center();
    } catch (error) {
      console.warn("Failed to sync window size to spotlight panel bounds:", error);
    }
  }, [tauriRuntimeAvailable]);

  const trackRecent = useCallback((item: SearchResult) => {
    const nextEntry: RecentEntry = {
      id: item.id,
      type: item.type,
      timestamp: Date.now(),
    };

    setRecents((current) => {
      return [nextEntry, ...current.filter((entry) => !(entry.id === item.id && entry.type === item.type))].slice(
        0,
        MAX_RECENTS,
      );
    });
  }, []);

  const handleShortcut = useCallback(
    async (event: ShortcutEvent) => {
      if (!tauriRuntimeAvailable || event.state !== "Pressed") {
        return;
      }

      const currentWindow = getCurrentWindow();
      let isVisible = windowVisibleRef.current;

      try {
        isVisible = await currentWindow.isVisible();
      } catch (error) {
        console.warn("Could not read window visibility from Tauri, falling back to local state:", error);
      }

      if (isVisible) {
        try {
          await currentWindow.hide();
          setWindowVisible(false);
        } catch (error) {
          console.error("Failed to hide Spotlight window:", error);
        }
        return;
      }

      try {
        await currentWindow.show();
        setWindowVisible(true);
      } catch (error) {
        console.error("Failed to show Spotlight window:", error);
        return;
      }

      try {
        await currentWindow.setFocus();
      } catch (error) {
        console.warn("Spotlight window was shown but could not be focused:", error);
      }
    },
    [tauriRuntimeAvailable],
  );

  useEffect(() => {
    windowVisibleRef.current = windowVisible;
  }, [windowVisible]);

  useEffect(() => {
    if (!tauriRuntimeAvailable || !windowVisible) {
      return;
    }

    const resizeOnNextFrame = window.requestAnimationFrame(() => {
      void syncWindowToPanelBounds();
    });

    return () => {
      window.cancelAnimationFrame(resizeOnNextFrame);
    };
  }, [
    commands.length,
    documents.length,
    previewDocument,
    tauriRuntimeAvailable,
    syncWindowToPanelBounds,
    windowVisible,
  ]);

  useEffect(() => {
    if (!tauriRuntimeAvailable) {
      setWindowVisible(true);
      return;
    }

    try {
      const currentWindow = getCurrentWindow();
      void currentWindow
        .isVisible()
        .then(setWindowVisible)
        .catch(() => {
          setWindowVisible(true);
        });
    } catch {
      setWindowVisible(true);
    }
  }, [tauriRuntimeAvailable]);

  useEffect(() => {
    if (!tauriRuntimeAvailable) {
      setShortcutLabel("Browser mode");
      return;
    }

    let activeShortcut: string | null = null;

    const registerShortcut = async () => {
      try {
        await register(PRIMARY_WINDOW_SHORTCUT, handleShortcut);
        activeShortcut = PRIMARY_WINDOW_SHORTCUT;
        setShortcutLabel(getShortcutLabel(PRIMARY_WINDOW_SHORTCUT));
      } catch (primaryError) {
        console.warn("Primary shortcut unavailable, trying fallback:", primaryError);

        try {
          await register(FALLBACK_WINDOW_SHORTCUT, handleShortcut);
          activeShortcut = FALLBACK_WINDOW_SHORTCUT;
          setShortcutLabel(getShortcutLabel(FALLBACK_WINDOW_SHORTCUT));
        } catch (fallbackError) {
          console.error("Could not register any global shortcut:", fallbackError);
          setShortcutLabel("Unavailable");
        }
      }
    };

    void registerShortcut();

    return () => {
      if (activeShortcut) {
        void unregister(activeShortcut).catch((error) => {
          console.error("Failed to unregister shortcut:", error);
        });
        return;
      }

      void unregister(PRIMARY_WINDOW_SHORTCUT).catch(() => undefined);
      void unregister(FALLBACK_WINDOW_SHORTCUT).catch(() => undefined);
    };
  }, [handleShortcut, tauriRuntimeAvailable]);

  useEffect(() => {
    const loadManifest = async () => {
      const docsRequest = fetch("/markdown-files/files.json");
      const commandsRequest = fetch("/commands/commands.json");

      const [docsResult, commandsResult] = await Promise.allSettled([docsRequest, commandsRequest]);

      let nextDocuments: DocItem[] = [];
      let nextCommands: CommandItem[] = [];

      if (docsResult.status === "fulfilled" && docsResult.value.ok) {
        const docsPayload: unknown = await docsResult.value.json();
        nextDocuments = normalizeDocManifest(docsPayload);
      } else {
        setManifestError("Could not load /markdown-files/files.json.");
      }

      if (commandsResult.status === "fulfilled" && commandsResult.value.ok) {
        const commandsPayload: unknown = await commandsResult.value.json();
        nextCommands = normalizeCommandManifest(commandsPayload);
      } else {
        setManifestError((current) => current ?? "Could not load /commands/commands.json.");
      }

      setDocuments(nextDocuments);
      setCommands(nextCommands);
      setPreviewDocument((current) => {
        if (!current) {
          return null;
        }

        return nextDocuments.find((entry) => entry.id === current.id) ?? null;
      });
    };

    void loadManifest();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
    } catch {
      // Ignore write failures in private mode or restricted contexts.
    }
  }, [recents]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LAST_QUERY_STORAGE_KEY, query);
    } catch {
      // Ignore write failures in private mode or restricted contexts.
    }
  }, [query]);

  useEffect(() => {
    if (!windowVisible) {
      return;
    }

    const focusTimeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [windowVisible]);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [feedbackMessage]);

  useEffect(() => {
    if (!openActionMenuId) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-action-menu='true']")) {
        setOpenActionMenuId(null);
      }
    };

    window.addEventListener("mousedown", onPointerDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [openActionMenuId]);

  useEffect(() => {
    if (!previewDocument) {
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewContent("");
      return;
    }

    const abortController = new AbortController();

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const response = await fetch(previewDocument.path, { signal: abortController.signal });
        if (!response.ok) {
          throw new Error(`Failed to load ${previewDocument.title}`);
        }

        const content = await response.text();
        if (!abortController.signal.aborted) {
          setPreviewContent(content);
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Failed to load preview content:", error);
        setPreviewContent("");
        setPreviewError("Could not load this document preview.");
      } finally {
        if (!abortController.signal.aborted) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      abortController.abort();
    };
  }, [previewDocument]);

  const itemByKey = useMemo(() => {
    const map = new Map<string, SearchResult>();

    for (const entry of commands) {
      map.set(makeItemKey(entry), entry);
    }

    for (const entry of documents) {
      map.set(makeItemKey(entry), entry);
    }

    return map;
  }, [commands, documents]);

  const recencyMap = useMemo(() => {
    return recents.reduce<Map<string, number>>((accumulator, recentEntry) => {
      accumulator.set(makeItemKey(recentEntry), recentEntry.timestamp);
      return accumulator;
    }, new Map());
  }, [recents]);

  const results = useMemo<SearchResult[]>(() => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return getDefaultResults(commands, documents, recents, itemByKey);
    }

    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const searchableItems: SearchResult[] = [...commands, ...documents];

    return searchableItems
      .map((item) => ({
        item,
        score: scoreMatch(item, normalizedQuery, tokens),
        recency: recencyMap.get(makeItemKey(item)) ?? 0,
      }))
      .filter((entry) => entry.score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if (right.recency !== left.recency) {
          return right.recency - left.recency;
        }

        return left.item.title.localeCompare(right.item.title);
      })
      .map((entry) => entry.item);
  }, [commands, documents, itemByKey, query, recencyMap, recents]);

  useEffect(() => {
    if (!results.length) {
      setSelectedIndex(-1);
      return;
    }

    setSelectedIndex((current) => {
      if (current < 0 || current >= results.length) {
        return 0;
      }

      return current;
    });
  }, [results]);

  useEffect(() => {
    setOpenActionMenuId(null);
    setSelectedIndex(0);
  }, [query]);

  const commandCount = commands.length;
  const documentCount = documents.length;

  const commandRows = useMemo(() => {
    return results
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.index > 0 && entry.item.type === "command");
  }, [results]);

  const documentRows = useMemo(() => {
    return results
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.index > 0 && entry.item.type === "document");
  }, [results]);

  const copyCommand = useCallback(
    async (commandItem: CommandItem) => {
      try {
        await navigator.clipboard.writeText(commandItem.command);
        setFeedbackMessage(`Copied command: ${commandItem.title}`);
        trackRecent(commandItem);
      } catch (error) {
        console.error("Failed to copy command:", error);
        setFeedbackMessage("Clipboard copy failed.");
      }
    },
    [trackRecent],
  );

  const pasteIntoSearch = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setFeedbackMessage("Clipboard is empty.");
        return;
      }

      const input = inputRef.current;
      if (!input) {
        setQuery((current) => `${current}${text}`);
        return;
      }

      const start = input.selectionStart ?? query.length;
      const end = input.selectionEnd ?? query.length;
      const nextQuery = `${query.slice(0, start)}${text}${query.slice(end)}`;
      const nextCursor = start + text.length;

      setQuery(nextQuery);
      setFeedbackMessage("Pasted into search.");

      window.requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(nextCursor, nextCursor);
      });
    } catch (error) {
      console.error("Failed to paste from clipboard:", error);
      setFeedbackMessage("Clipboard paste failed.");
    }
  }, [query]);

  const activateResult = useCallback(
    (item: SearchResult) => {
      if (item.type === "command") {
        void copyCommand(item);
        return;
      }

      setPreviewDocument(item);
      setFeedbackMessage(`Opened document: ${item.title}`);
      trackRecent(item);
    },
    [copyCommand, trackRecent],
  );

  const closeWindow = useCallback(async () => {
    if (!tauriRuntimeAvailable) {
      setQuery("");
      setOpenActionMenuId(null);
      return;
    }

    try {
      await getCurrentWindow().hide();
      setWindowVisible(false);
      setOpenActionMenuId(null);
    } catch (error) {
      console.error("Could not hide the Spotlight window:", error);
    }
  }, [tauriRuntimeAvailable]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!results.length) {
        if (event.key === "Escape") {
          event.preventDefault();
          void closeWindow();
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => {
          const safeIndex = current < 0 ? 0 : current;
          return (safeIndex + 1) % results.length;
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => {
          const safeIndex = current < 0 ? 0 : current;
          return (safeIndex - 1 + results.length) % results.length;
        });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const selectedItem = results[selectedIndex] ?? results[0];
        if (selectedItem) {
          activateResult(selectedItem);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        void closeWindow();
      }
    },
    [activateResult, closeWindow, results, selectedIndex],
  );

  const selectedItem = selectedIndex >= 0 ? (results[selectedIndex] ?? null) : null;
  const topHit = results[0] ?? null;

  const renderResultRow = (item: SearchResult, index: number, topHitStyle = false) => {
    const isSelected = index === selectedIndex;
    const isCommand = item.type === "command";
    const commandItem = isCommand ? item : null;

    return (
      <article
        key={makeItemKey(item)}
        className={`result-row ${isSelected ? "is-selected" : ""} ${topHitStyle ? "is-top-hit" : ""}`}
        role="option"
        aria-selected={isSelected}
        onMouseEnter={() => setSelectedIndex(index)}
      >
        <button
          type="button"
          className="result-row__main"
          onClick={() => activateResult(item)}
          aria-label={`${item.title}${isCommand ? " command" : " document"}`}
        >
          <div className="result-row__meta">
            <span className={`result-row__type result-row__type--${item.type}`}>
              {item.type === "command" ? "Command" : "Document"}
            </span>
            <h3>{item.title}</h3>
            {isCommand ? (
              <p>{commandItem?.description || commandItem?.command}</p>
            ) : (
              <p className="result-row__path">{(item as DocItem).path}</p>
            )}
          </div>
          {isCommand && <code className="result-row__command">{commandItem?.command}</code>}
        </button>

        {isCommand && commandItem && (
          <div className="result-row__actions" data-action-menu="true">
            <button
              type="button"
              className="result-row__action-trigger"
              onClick={(event) => {
                event.stopPropagation();
                setSelectedIndex(index);
                setOpenActionMenuId((current) => (current === commandItem.id ? null : commandItem.id));
              }}
              aria-haspopup="menu"
              aria-expanded={openActionMenuId === commandItem.id}
            >
              Actions
            </button>

            {openActionMenuId === commandItem.id && (
              <div className="result-row__menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyCommand(commandItem);
                    setOpenActionMenuId(null);
                  }}
                >
                  Copy
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={(event) => {
                    event.stopPropagation();
                    void pasteIntoSearch();
                    setOpenActionMenuId(null);
                  }}
                >
                  Paste
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className={`spotlight-root ${tauriRuntimeAvailable ? "spotlight-root--tauri" : ""} ${!windowVisible && tauriRuntimeAvailable ? "spotlight-root--hidden" : ""}`}>
      <div className="spotlight-backdrop" />
      <main ref={panelRef} className="spotlight-panel" aria-label="Spotlight command palette">
        <header className="spotlight-panel__header">
          <div className="spotlight-traffic" aria-hidden="true">
            <span className="spotlight-traffic__dot spotlight-traffic__dot--red" />
            <span className="spotlight-traffic__dot spotlight-traffic__dot--yellow" />
            <span className="spotlight-traffic__dot spotlight-traffic__dot--green" />
          </div>
          <p>Spotlight</p>
          <span className="spotlight-shortcut">{shortcutLabel}</span>
        </header>

        <label className="spotlight-search" htmlFor="spotlight-search-input">
          <span className="spotlight-search__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            id="spotlight-search-input"
            type="search"
            value={query}
            placeholder="Search commands and documents"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            spellCheck={false}
            aria-controls={resultsContainerId}
            aria-activedescendant={selectedItem ? makeItemKey(selectedItem) : undefined}
          />
          {query && (
            <button
              type="button"
              className="spotlight-search__clear"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
            >
              Clear
            </button>
          )}
        </label>

        {manifestError && <p className="spotlight-error">{manifestError}</p>}

        <section className="spotlight-results" id={resultsContainerId} role="listbox" aria-label="Search results">
          {!results.length && <p className="spotlight-empty">No matches. Try another keyword.</p>}

          {topHit && (
            <section className="result-group">
              <header className="result-group__title">Top Hit</header>
              {renderResultRow(topHit, 0, true)}
            </section>
          )}

          {commandRows.length > 0 && (
            <section className="result-group">
              <header className="result-group__title">Commands</header>
              <div className="result-group__list">{commandRows.map(({ item, index }) => renderResultRow(item, index))}</div>
            </section>
          )}

          {documentRows.length > 0 && (
            <section className="result-group">
              <header className="result-group__title">Documents</header>
              <div className="result-group__list">{documentRows.map(({ item, index }) => renderResultRow(item, index))}</div>
            </section>
          )}
        </section>

        {previewDocument && (
          <section className="spotlight-preview" aria-label="Document preview">
            <header className="spotlight-preview__header">
              <div>
                <h2>{previewDocument.title}</h2>
                <p>{previewDocument.path}</p>
              </div>
              <button type="button" onClick={() => setPreviewDocument(null)}>
                Close
              </button>
            </header>

            {previewLoading && <p className="spotlight-preview__state">Loading preview...</p>}
            {previewError && <p className="spotlight-preview__state spotlight-preview__state--error">{previewError}</p>}

            {!previewLoading && !previewError && (
              <article className="spotlight-preview__content markdown-body">
                <Markdown remarkPlugins={[remarkGfm]}>{previewContent}</Markdown>
              </article>
            )}
          </section>
        )}

        <footer className="spotlight-footer" role="status" aria-live="polite">
          <span>
            {commandCount} commands - {documentCount} documents
          </span>
          <span>{selectedItem?.type === "command" ? "Enter copies command" : "Enter opens preview"}</span>
          <span>{feedbackMessage ?? "Use Up/Down to navigate | Esc to close"}</span>
        </footer>
      </main>
    </div>
  );
}

export default App;

