"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type ChatContextType = {
  isOpen: boolean;
  toggleChat: () => void;
  isExpanded: boolean;
  toggleExpand: () => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleChat = () => setIsOpen(prev => !prev);
  const toggleExpand = () => setIsExpanded(prev => !prev);

  // 這一行是為了讓 F5 重新整理時重置狀態，或者您可以選擇讀取 localStorage
  useEffect(() => {
    setIsOpen(false);
  }, []);

  return (
    <ChatContext.Provider value={{ isOpen, toggleChat, isExpanded, toggleExpand }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}