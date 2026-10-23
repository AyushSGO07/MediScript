import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  MapPin,
  Bot,
  User,
  ShieldCheck,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ChatMessageResponse, CitationReference } from '../../types';

interface ReviewChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: string;
  onJumpToCitation?: (citation: CitationReference) => void;
}

interface ChatHistoryItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: CitationReference[];
  isAbstained?: boolean;
  engine?: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'What is the expiration date?',
  'What are the storage temperature limits?',
  'Is this device single use or sterile?',
  'What are the contraindications & warnings?',
  'Check pediatric guidelines (Abstention Test)',
];

export const ReviewChatDrawer: React.FC<ReviewChatDrawerProps> = ({
  isOpen,
  onClose,
  reviewId,
  onJumpToCitation,
}) => {
  const [messages, setMessages] = useState<ChatHistoryItem[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello, I am your Grounded Review Copilot. I analyze the active medical label using physical coordinate evidence. Every response cites exact page blocks [p. X, block Y]. If information is missing from the label, I will strictly abstain rather than fabricate answers.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'revised' | 'baseline'>('revised');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q || loading) return;

    const userMsg: ChatHistoryItem = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res: ChatMessageResponse = await api.sendReviewChat(reviewId, q, selectedRole);
      const assistantMsg: ChatHistoryItem = {
        id: `assist-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        citations: res.citations,
        isAbstained: res.is_abstained,
        engine: res.engine,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatHistoryItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to grounded review engine: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900/95 backdrop-blur-md border-l border-slate-700/80 shadow-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between bg-slate-850/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              Grounded AI Copilot
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                100% Offline Verifiable
              </span>
            </h3>
            <p className="text-xs text-slate-400">Strict [p. X, block Y] physical citations</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-100 rounded-md hover:bg-slate-800 transition-colors"
          title="Close Copilot"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Target Document Selector */}
      <div className="px-5 py-2.5 bg-slate-800/40 border-b border-slate-700/60 flex items-center justify-between text-xs">
        <span className="text-slate-400">Target Document:</span>
        <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700">
          <button
            onClick={() => setSelectedRole('revised')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedRole === 'revised'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Revised Label
          </button>
          <button
            onClick={() => setSelectedRole('baseline')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              selectedRole === 'baseline'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Baseline Label
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              {msg.sender === 'user' ? (
                <>
                  <span className="text-[11px] text-slate-400">You ({msg.timestamp})</span>
                  <User className="w-3.5 h-3.5 text-slate-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-[11px] text-teal-400 font-medium">
                    Evidence Assistant ({msg.timestamp})
                  </span>
                </>
              )}
            </div>

            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-teal-600 text-white shadow-md'
                  : msg.isAbstained
                  ? 'bg-amber-950/40 border border-amber-500/40 text-amber-200 shadow-md'
                  : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 shadow-md'
              }`}
            >
              {msg.isAbstained && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-500/20 text-amber-300 font-semibold text-[11px]">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  Zero-Hallucination Guardrail Active
                </div>
              )}

              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Citations list if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-700/80 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                    <MapPin className="w-3 h-3 text-teal-400" /> Verified Evidence:
                  </span>
                  {msg.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onJumpToCitation && onJumpToCitation(c)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-500/15 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 font-mono text-[11px] transition-colors"
                      title={`Jump to Page ${c.page_number}, Block ${c.block_index}`}
                    >
                      <span>
                        [p. {c.page_number}, block {c.block_index}]
                      </span>
                      <span className="text-[9px] text-teal-400">↗</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
            <span>Scanning physical text coordinates and matching parameters...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-5 py-2.5 bg-slate-850 border-t border-slate-700/60 overflow-x-auto">
        <div className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5 text-teal-400" /> Quick Regulatory Checks:
        </div>
        <div className="flex gap-1.5 flex-nowrap pb-1">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="whitespace-nowrap px-2.5 py-1 text-[11px] rounded-full bg-slate-800 hover:bg-teal-500/20 text-slate-300 hover:text-teal-200 border border-slate-700 hover:border-teal-500/40 transition-colors shrink-0 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about expiration, storage, sterility, or warnings..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Zero-hallucination guarantee: Answers without coordinate citations are rejected.
        </div>
      </div>
    </div>
  );
};
