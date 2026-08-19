"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Database,
  Image as ImageIcon,
  MessageCircle,
  Search,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from "lucide-react";
import { processAndMergeZip } from "@/lib/parser/dataMerger";
import { inspectZipThreads } from "@/lib/parser/zipResolver";
import { createClient } from "@/lib/supabase/client";
import { useDispatch } from "react-redux";
import { apiSlice } from "@/store/api/apiSlice";
import UploadDropzone from "@/components/molecules/upload/UploadDropzone";
import UploadStatCard from "@/components/molecules/upload/UploadStatCard";
import Button from "@/components/atoms/Button";

export default function UploadDashboard() {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [completedStats, setCompletedStats] = useState(null);
  
  const [detectedThreads, setDetectedThreads] = useState([]);
  const [selectedThreadIds, setSelectedThreadIds] = useState(new Set());
  const [threadSearch, setThreadSearch] = useState("");

  const fileInputRef = useRef(null);
  const router = useRouter();
  const supabase = createClient();

  const handleInspectFile = async (selectedFile) => {
    setFile(selectedFile);
    setErrorMsg("");
    setIsScanning(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { threads } = await inspectZipThreads(selectedFile, user?.id);
      setDetectedThreads(threads);
      setSelectedThreadIds(new Set(threads.map((t) => t.threadFolderId)));
    } catch (err) {
      console.error("Failed to inspect zip:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".zip")) {
        handleInspectFile(droppedFile);
      } else {
        setErrorMsg("Please select a valid Instagram export .zip file.");
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.name.endsWith(".zip")) {
        handleInspectFile(selected);
      } else {
        setErrorMsg("Please select a valid Instagram export .zip file.");
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedThreadIds.size === detectedThreads.length) {
      setSelectedThreadIds(new Set());
    } else {
      setSelectedThreadIds(new Set(detectedThreads.map((t) => t.threadFolderId)));
    }
  };

  const handleToggleThread = (threadFolderId) => {
    const next = new Set(selectedThreadIds);
    if (next.has(threadFolderId)) {
      next.delete(threadFolderId);
    } else {
      next.add(threadFolderId);
    }
    setSelectedThreadIds(next);
  };

  const filteredThreads = detectedThreads.filter((t) =>
    t.participantName.toLowerCase().includes(threadSearch.toLowerCase())
  );

  const handleStartImport = async () => {
    if (!file) return;
    setIsProcessing(true);
    setErrorMsg("");
    setStatus({ phase: "init", message: "Starting process engine..." });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg("You must be logged in to upload archives.");
        setIsProcessing(false);
        return;
      }

      const options = {
        selectedThreadIds: Array.from(selectedThreadIds),
      };

      const result = await processAndMergeZip(
        file,
        user.id,
        (update) => {
          setStatus(update);
        },
        options,
      );

      if (result.success) {
        dispatch(apiSlice.util.invalidateTags(['Conversations', 'Messages', 'Profile', 'Feed', 'Stories']));
        setCompletedStats(result.stats);
      }
    } catch (err) {
      console.error("Import failed:", err);
      setErrorMsg(
        err.message ||
          "Import failed. Please verify your ZIP export structure.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Upload Instagram Export Data
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Select your official Instagram exported ZIP archive (HTML or JSON
          format). New data will merge seamlessly with your existing vault
          without creating duplicates.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!completedStats ? (
        <div className="bg-white dark:bg-ig-surface border border-gray-200 dark:border-ig-border rounded-2xl p-6 md:p-10 text-center shadow-sm transition-colors duration-200">
          {!isProcessing ? (
            <>
              {/* Upload Dropzone Molecule */}
              <UploadDropzone
                file={file}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                fileInputRef={fileInputRef}
                onSelect={handleFileSelect}
              />

              {isScanning && (
                <div className="mt-6 p-6 bg-slate-50 dark:bg-black/40 border border-gray-200 dark:border-ig-border rounded-xl flex items-center justify-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <RefreshCw size={18} className="animate-spin text-ig-primary" />
                  <span>Scanning ZIP file for chat threads...</span>
                </div>
              )}

              {file && !isScanning && (
                <div className="mt-6 max-w-xl mx-auto space-y-4 text-left">
                  {detectedThreads.length > 0 ? (
                    <div className="bg-slate-50 dark:bg-black/60 border border-gray-200 dark:border-ig-border rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                            <SlidersHorizontal size={16} className="text-ig-primary" />
                            <span>Select Chats to Upload / Update</span>
                          </h3>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {selectedThreadIds.size} of {detectedThreads.length} chat threads selected
                          </p>
                        </div>

                        <button
                          onClick={handleToggleSelectAll}
                          className="text-xs font-semibold text-ig-primary hover:underline flex items-center gap-1.5"
                        >
                          {selectedThreadIds.size === detectedThreads.length ? (
                            <>
                              <CheckSquare size={14} />
                              <span>Deselect All</span>
                            </>
                          ) : (
                            <>
                              <Square size={14} />
                              <span>Select All ({detectedThreads.length})</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
                        <input
                          type="text"
                          value={threadSearch}
                          onChange={(e) => setThreadSearch(e.target.value)}
                          placeholder="Search chat names..."
                          className="w-full bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-ig-primary"
                        />
                      </div>

                      {/* Scrollable list of threads with checkboxes */}
                      <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-gray-200 dark:divide-[#1a1a1a]">
                        {filteredThreads.map((thread) => {
                          const isSelected = selectedThreadIds.has(thread.threadFolderId);

                          return (
                            <div
                              key={thread.threadFolderId}
                              onClick={() => handleToggleThread(thread.threadFolderId)}
                              className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? "bg-ig-primary/10 border border-ig-primary/30" : "bg-white dark:bg-[#111] hover:bg-gray-100 dark:hover:bg-[#181818] border border-transparent"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleThread(thread.threadFolderId)}
                                className="w-4 h-4 rounded accent-ig-primary cursor-pointer"
                              />

                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-ig-surface border border-gray-300 dark:border-ig-border flex items-center justify-center font-bold text-gray-900 dark:text-white text-xs uppercase flex-shrink-0">
                                {thread.participantName.charAt(0)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-xs text-gray-900 dark:text-white truncate block">
                                  {thread.participantName}
                                </span>
                                <span className="text-[10px] text-gray-500 block">
                                  {thread.fileCount} archive file{thread.fileCount !== 1 ? 's' : ''}
                                </span>
                              </div>

                              <div>
                                {thread.existsInDb ? (
                                  <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                                    Update Existing
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                                    New Chat
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <Button
                    onClick={handleStartImport}
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                  >
                    <span>
                      {selectedThreadIds.size > 0
                        ? `Start Parsing & Merging (${selectedThreadIds.size} Chat${selectedThreadIds.size !== 1 ? 's' : ''} Selected)`
                        : "Start Parsing & Merging (Connections & Vault Data)"}
                    </span>
                    <ArrowRight size={18} />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-ig-primary/10 text-ig-primary flex items-center justify-center mb-6 animate-spin">
                <RefreshCw size={28} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Processing Instagram Archive
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">
                {status?.message ||
                  "Extracting media and parsing relational structure..."}
              </p>

              <div className="w-full max-w-md bg-slate-50 dark:bg-black border border-gray-200 dark:border-ig-border rounded-xl p-4 text-left space-y-3 text-xs">
                <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                  <span>Current Phase:</span>
                  <span className="font-semibold text-ig-primary uppercase tracking-wider">
                    {status?.phase || "Initializing"}
                  </span>
                </div>

                {status?.total > 0 && (
                  <div className="w-full bg-gray-200 dark:bg-ig-surface rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-ig-primary h-full transition-all duration-300"
                      style={{
                        width: `${Math.round(((status.current || 0) / status.total) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-ig-surface border border-gray-200 dark:border-ig-border rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mb-4 mx-auto">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Import & Merge Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-8">
            Your Instagram export data has been parsed and safely synchronized.
          </p>

          {/* Stats Grid composed of UploadStatCard molecules */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <UploadStatCard
              icon={ImageIcon}
              value={completedStats.posts}
              label="Posts Synced"
            />
            <UploadStatCard
              icon={MessageCircle}
              value={completedStats.messages}
              label="Messages Merged"
            />
            <UploadStatCard
              icon={Database}
              value={completedStats.threads}
              label="Chat Threads"
            />
            <UploadStatCard
              icon={CheckCircle2}
              value={completedStats.connections}
              label="Connections"
            />
          </div>

          <Button
            onClick={() => router.push("/")}
            variant="primary"
            size="lg"
            className="mx-auto"
          >
            Go to Instagram Feed
          </Button>
        </div>
      )}
    </div>
  );
}
