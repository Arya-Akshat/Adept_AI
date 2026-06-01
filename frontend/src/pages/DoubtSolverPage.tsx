import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { pdfApi, PDF } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const FASTAPI_URL = import.meta.env.VITE_FASTAPI_URL || (import.meta.env.DEV ? "http://localhost:5001" : "https://adept-ai-fastapi.onrender.com");

export const DoubtSolverPage: React.FC = () => {
  const { pdfId } = useParams<{ pdfId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaitingFirstToken, setIsWaitingFirstToken] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [retrying, setRetrying] = useState(false);

  // Get filename from router state or fetch it
  const stateFilename = location.state?.filename;
  const [filename, setFilename] = useState<string>(stateFilename || "Loading...");

  // Load PDF metadata and chat history on mount
  useEffect(() => {
    if (!pdfId) {
      navigate("/library");
      return;
    }

    const loadMetadata = async () => {
      try {
        setLoadingPdf(true);
        const res = await pdfApi.getPDFMetadata(pdfId);
        setPdf(res.data);
        setFilename(res.data.originalName);

        // Verify that vectorStatus is ready
        if (res.data.vectorStatus !== "ready" && res.data.vectorStatus !== "failed") {
          toast({
            title: "Not Ready",
            description: "This document is still being processed. Please wait.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to load PDF metadata", err);
        toast({
          title: "Error",
          description: "Failed to load PDF metadata. Redirecting to library.",
          variant: "destructive",
        });
        navigate("/library");
      } finally {
        setLoadingPdf(false);
      }
    };

    loadMetadata();

    // Load chat history
    const historyKey = `doubt_history_${pdfId}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, [pdfId, navigate]);

  // Poll metadata if vectorStatus is queued or processing
  useEffect(() => {
    if (!pdfId || !pdf || (pdf.vectorStatus !== "queued" && pdf.vectorStatus !== "processing")) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await pdfApi.getPDFMetadata(pdfId);
        if (res.data.vectorStatus === "ready") {
          setPdf(res.data);
          toast({
            title: "Ready",
            description: "Knowledge base is ready! You can now ask questions.",
          });
        } else if (res.data.vectorStatus === "failed") {
          setPdf(res.data);
        }
      } catch (err) {
        console.error("Failed to poll PDF metadata", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pdfId, pdf]);

  const handleRetry = async () => {
    if (!pdfId) return;
    try {
      setRetrying(true);
      await pdfApi.generateRoadmap(pdfId);
      toast({
        title: 'Success',
        description: 'Indexing re-queued successfully',
      });
      // Start polling status
      setPdf(prev => prev ? { ...prev, vectorStatus: "queued" } : null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to re-queue indexing job',
        variant: 'destructive',
      });
    } finally {
      setRetrying(false);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse, isWaitingFirstToken]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isGenerating || !pdfId) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsGenerating(true);
    setIsWaitingFirstToken(true);
    setStreamingResponse("");

    // Persist to local storage
    localStorage.setItem(`doubt_history_${pdfId}`, JSON.stringify(newMessages));

    // Get last 5 turns of conversation history
    const conversationHistory = newMessages.slice(-5).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const response = await fetch(`${FASTAPI_URL}/doubt-solver/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfId,
          question: userMessage.content,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No readable stream in response");

      let currentAssistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Parse SSE lines: data: {"token": "..."}
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.token) {
                setIsWaitingFirstToken(false);
                currentAssistantText += dataObj.token;
                setStreamingResponse(currentAssistantText);
              } else if (dataObj.done) {
                // Handled in stream finish
              } else if (dataObj.error) {
                throw new Error(dataObj.error);
              }
            } catch (err) {
              // Ignore parse errors on partial streams unless it's a critical error
              console.warn("Error parsing chunk payload", err);
            }
          }
        }
      }

      // Append assistant message once stream completes
      const assistantMessage: Message = {
        role: "assistant",
        content: currentAssistantText || "I couldn't generate an answer. Please try again.",
      };
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      setStreamingResponse("");
      localStorage.setItem(`doubt_history_${pdfId}`, JSON.stringify(finalMessages));

    } catch (err: any) {
      console.error("Error generating answer", err);
      toast({
        title: "Generation Error",
        description: err.message || "Failed to communicate with AI solver",
        variant: "destructive",
      });
      // Append error message to chat
      const errorMsg: Message = {
        role: "assistant",
        content: "⚠️ An error occurred while generating the answer. Please click retry or try again.",
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsGenerating(false);
      setIsWaitingFirstToken(false);
    }
  };

  const handleClear = () => {
    if (!pdfId) return;
    localStorage.removeItem(`doubt_history_${pdfId}`);
    setMessages([]);
    setStreamingResponse("");
    toast({
      title: "Cleared",
      description: "Chat history has been cleared",
    });
  };

  const renderMessageContent = (text: string) => {
    // Simple bold regex
    let formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Simple bullet points replacement
    formatted = formatted.split("\n").map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        return `<li class="ml-4 list-disc">${trimmed.slice(2)}</li>`;
      }
      return trimmed;
    }).join("\n");

    // Replace double newlines or single newlines for paragraph spacing
    formatted = formatted.replace(/\n/g, "<br />");

    return <div dangerouslySetInnerHTML={{ __html: formatted }} className="text-[15px] leading-relaxed text-gray-800" />;
  };

  if (loadingPdf) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        </div>
      </Layout>
    );
  }

  // Error state: vectorStatus is failed
  if (pdf && pdf.vectorStatus === "failed") {
    return (
      <Layout>
        <div className="flex h-96 flex-col items-center justify-center text-center mt-12 max-w-md mx-auto">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">Knowledge Base Ingestion Failed</h2>
          <p className="text-muted-foreground mb-6">
            We encountered an error while building the AI knowledge base for this file:
            <span className="block mt-2 font-mono text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 max-h-24 overflow-y-auto">
              {pdf.vectorError || "Unknown processing error"}
            </span>
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/library")}
              variant="outline"
              className="rounded-xl px-5 py-2.5 border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-black text-white hover:bg-gray-900 rounded-xl px-5 py-2.5"
            >
              {retrying ? "Retrying..." : "Retry Indexing"}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state: vectorStatus is not ready (queued / processing)
  if (pdf && pdf.vectorStatus !== "ready") {
    return (
      <Layout>
        <div className="flex h-96 flex-col items-center justify-center text-center mt-12 max-w-md mx-auto">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-black border-t-transparent mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Knowledge Base Building</h2>
          <p className="text-muted-foreground mb-6">
            We are indexing the file "{filename}" into our AI database. Please wait a moment for the process to complete.
          </p>
          <Button onClick={() => navigate("/library")} className="bg-black text-white hover:bg-gray-900 rounded-xl px-5 py-2.5">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[760px] mx-auto mt-4 pb-32">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/library")} className="mb-4 text-xs font-bold rounded-xl text-gray-500 hover:text-black pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Doubt Solver <Sparkles className="h-5 w-5 text-orange-500 fill-orange-500" />
              </h1>
              <p className="text-xs text-gray-400 mt-1">Scoped to: <span className="font-semibold text-gray-700">{filename}</span></p>
            </div>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl">
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear chat
              </Button>
            )}
          </div>
          <hr className="mt-4 border-gray-100" />
        </div>

        {/* Chat Area */}
        <div className="space-y-6 overflow-y-auto mb-6 pr-2 max-h-[calc(100vh-320px)] min-h-[300px]">
          {messages.length === 0 && !streamingResponse && !isWaitingFirstToken && (
            <div className="flex gap-4 items-start bg-gray-50 rounded-2xl p-5 border border-gray-100 animate-fade-in-scale">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
                <Sparkles className="h-4 w-4 fill-orange-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">VedaAI Study Assistant</p>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Hi! I've read the study material for <strong>{filename}</strong>. Ask me any question, definition, or doubt from this material, and I'll explain it clearly using the scoped notes.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <span className="text-[10px] font-semibold text-gray-400 mb-1 px-2">
                {msg.role === "user" ? "You" : "VedaAI"}
              </span>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm leading-relaxed ${
                msg.role === "user" 
                  ? "bg-[#111] text-white rounded-tr-sm" 
                  : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
              }`}>
                {msg.role === "user" ? (
                  <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
            </div>
          ))}

          {/* AI Typing / Stream State */}
          {isWaitingFirstToken && (
            <div className="flex flex-col items-start animate-pulse">
              <span className="text-[10px] font-semibold text-gray-400 mb-1 px-2">VedaAI</span>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}

          {streamingResponse && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-semibold text-gray-400 mb-1 px-2">VedaAI</span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-white text-gray-800 border border-gray-100 shadow-sm">
                {renderMessageContent(streamingResponse)}
                <span className="inline-block w-1.5 h-4 ml-1 bg-orange-500 animate-pulse">|</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pb-6 pt-4 z-10">
          <div className="max-w-[760px] mx-auto px-4">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                placeholder={isGenerating ? "Responding..." : "Ask your doubt..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isGenerating}
                maxLength={500}
                className="w-full h-14 pl-6 pr-28 rounded-full border border-gray-200 focus:outline-none focus:ring-1 focus:ring-black/20 focus:border-black transition-all bg-white text-[15px] shadow-sm"
              />
              
              <div className="absolute right-3 flex items-center gap-3">
                {input.length > 400 && (
                  <span className="text-xs font-semibold text-gray-400">
                    {input.length}/500
                  </span>
                )}
                <Button 
                  type="submit" 
                  disabled={!input.trim() || isGenerating}
                  className="bg-black hover:bg-gray-900 text-white rounded-full h-9 px-4 py-2 text-xs font-bold transition-all shadow-md"
                >
                  Send <Send className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DoubtSolverPage;
