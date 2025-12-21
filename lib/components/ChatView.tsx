// FILE: src/components/ChatView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { ChatSession, Message } from '../types';
import { Send, User, ShieldCheck, Search, ChevronLeft, Check, CheckCheck } from 'lucide-react';

interface ChatViewProps {
  isAdmin: boolean;
  currentCustomerId: string; // ID unik browser user saat ini
  chatSessions: ChatSession[];
  onSendMessage: (customerId: string, text: string, sender: 'user' | 'admin') => void;
  onMarkAsRead?: (customerId: string, reader: 'user' | 'admin') => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  isAdmin, 
  currentCustomerId, 
  chatSessions, 
  onSendMessage,
  onMarkAsRead
}) => {
  // State untuk Admin: Memilih sesi chat mana yang dibuka
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper untuk scroll ke bawah
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Determine active session & messages based on role
  // Jika Admin: Gunakan selectedSessionId. Jika User: Gunakan currentCustomerId
  const activeSessionId = isAdmin ? selectedSessionId : currentCustomerId;
  
  const activeSession = chatSessions.find(s => s.customerId === activeSessionId) || {
    customerId: activeSessionId || 'unknown',
    customerName: 'Guest',
    messages: [],
    lastMessage: '',
    lastTimestamp: Date.now(),
    unreadAdminCount: 0,
    unreadUserCount: 0
  };

  const messages = activeSession.messages || [];

  // Effect: Scroll to bottom saat pesan berubah
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeSessionId, isAdmin]);

  // Effect: Mark as read saat membuka chat
  useEffect(() => {
    if (activeSessionId && messages.length > 0 && onMarkAsRead) {
      if (isAdmin && activeSession.unreadAdminCount > 0) {
        onMarkAsRead(activeSessionId, 'admin');
      } else if (!isAdmin && activeSession.unreadUserCount > 0) {
        onMarkAsRead(activeSessionId, 'user');
      }
    }
  }, [activeSessionId, messages.length, isAdmin, onMarkAsRead]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeSessionId) return;

    onSendMessage(activeSessionId, input, isAdmin ? 'admin' : 'user');
    setInput('');
  };

  // --- TAMPILAN ADMIN: DAFTAR INBOX ---
  if (isAdmin && !selectedSessionId) {
    // Sort sessions by newest activity
    const sortedSessions = [...chatSessions].sort((a, b) => b.lastTimestamp - a.lastTimestamp);

    return (
      <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden text-gray-100">
        <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
          <h2 className="font-bold text-gray-100 flex items-center gap-2">
            <ShieldCheck size={20} className="text-blue-500" />
            Inbox Pesan
          </h2>
          <span className="text-xs font-medium bg-blue-900/30 text-blue-300 px-2 py-1 rounded-full border border-blue-900/50">
            {chatSessions.length} Chat
          </span>
        </div>
        
        {/* Search Bar (Visual Only) */}
        <div className="p-3 border-b border-gray-700 bg-gray-800">
          <div className="relative">
             <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
             <input type="text" placeholder="Cari pelanggan..." className="w-full pl-9 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-800">
          {sortedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               <User size={48} className="mb-2 opacity-20" />
               <p className="text-sm">Belum ada pesan masuk</p>
            </div>
          ) : (
            sortedSessions.map(session => (
              <div 
                key={session.customerId}
                onClick={() => setSelectedSessionId(session.customerId)}
                className="p-4 border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors flex gap-3 group relative"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-900/30 group-hover:text-blue-400 transition-colors border border-gray-600">
                    <User size={20} />
                  </div>
                  {session.unreadAdminCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-800">
                      {session.unreadAdminCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm ${session.unreadAdminCount > 0 ? 'font-bold text-white' : 'font-semibold text-gray-300'}`}>
                      {session.customerName}
                    </h3>
                    <span className="text-[10px] text-gray-500">
                      {new Date(session.lastTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${session.unreadAdminCount > 0 ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                    {session.lastMessage}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // --- TAMPILAN CHAT ROOM (Untuk Admin & User) ---
  return (
    <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={() => setSelectedSessionId(null)}
              className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white mr-1"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className={`p-2 rounded-full ${isAdmin ? 'bg-gray-700 text-gray-300' : 'bg-blue-900/30 text-blue-400'}`}>
            {isAdmin ? <User size={20} /> : <ShieldCheck size={20} />}
          </div>
          <div>
            <h2 className="font-bold text-gray-100 text-sm leading-tight">
              {isAdmin ? activeSession.customerName : 'Admin Support'}
            </h2>
            <div className="flex items-center text-[10px] text-gray-400">
              {isAdmin ? 'Pelanggan' : 'Online • Siap membantu'}
            </div>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
        {messages.length === 0 && !isAdmin && (
           <div className="bg-gray-800 p-4 rounded-xl shadow-sm text-center my-4 mx-4 border border-gray-700">
              <p className="text-sm text-gray-200 font-medium mb-1">Selamat Datang di StockMaster!</p>
              <p className="text-xs text-gray-500">Silakan tanyakan ketersediaan stok atau info harga kepada admin kami.</p>
           </div>
        )}
        
        {messages.map((msg) => {
          // Logic bubble: "Me" depends on role
          const isMe = (isAdmin && msg.sender === 'admin') || (!isAdmin && msg.sender === 'user');
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in zoom-in-95 duration-200`}>
              <div className={`max-w-[80%] px-3 py-2 shadow-sm text-sm relative group ${
                isMe 
                  ? 'bg-blue-600 text-white rounded-2xl rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-2xl rounded-tl-none'
              }`}>
                <p className="pb-1">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isMe && (
                    msg.read ? <CheckCheck size={12} /> : <Check size={12} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center space-x-2 bg-gray-700 rounded-full px-2 py-2 border border-gray-600 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isAdmin ? "Balas pesan..." : "Tulis pesan ke admin..."}
            className="flex-1 bg-transparent px-3 text-sm text-white placeholder-gray-400 focus:outline-none"
          />
          <button 
            type="submit"
            className={`p-2 rounded-full transition-all duration-200 ${input.trim() ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md' : 'bg-gray-600 text-gray-400 cursor-default'}`}
            disabled={!input.trim()}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};