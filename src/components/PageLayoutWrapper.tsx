"use client";

import { useChat } from "@/context/ChatContext";

export default function PageLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isOpen, isExpanded } = useChat();

  return (
    <div 
      className={`
        min-h-screen transition-all duration-300 ease-in-out
        ${isOpen ? (isExpanded ? "md:mr-[600px]" : "md:mr-[400px]") : "mr-0"}
      `}
    >
      {children}
    </div>
  );
}