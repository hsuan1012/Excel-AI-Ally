"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
// ✅ 1. 引入 RotateCcw 圖示
import { X, ImageIcon, ChevronLeft, Send, Sparkles, RotateCcw } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { initializeGemini, getChatResponse } from '@/lib/gemini';
import { useChat } from "@/context/ChatContext";

// --- 預設問題列表 ---
const PRESET_QUESTIONS = [
  "Excel 怎麼使用 VLOOKUP？",
  "如何製作樞紐分析表？",
  "幫我解釋 IF 函數的用法",
  "出現 #N/A 錯誤怎麼辦？",
  "如何刪除重複的資料？",
  "怎麼把文字分欄？"
];

type ChatMessage = {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  imageUrl?: string;
};

// --- 子元件：聊天訊息氣泡 ---
const ChatMessageItem = ({ message, isUser, imageUrl }: { message: string; isUser: boolean; imageUrl?: string }) => {
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
             <Image src="/avatar5.png" alt="AI" width={36} height={36} className="object-cover" />
          </div>
        </div>
      )}
      
      <div 
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser 
            // ✅ 修改：背景改為紫色
            ? 'bg-purple-600 text-white' 
            : 'bg-white border border-gray-100 text-gray-800'
        }`}
      >
         {imageUrl && (
            <div className="mb-3">
              <Image src={imageUrl} alt="Uploaded" width={240} height={160} className="rounded-lg border border-gray-200" />
            </div>
         )}
         
         <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-gray-800'}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a target="_blank" rel="noopener noreferrer" className={`underline font-medium ${isUser ? 'text-white' : 'text-purple-600 hover:text-purple-800'}`} {...props} />
                ),
                // 強制設定標題樣式，確保字體變大
                h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-3 border-b pb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-3 mb-1" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                blockquote: ({ children }) => (
                  <blockquote className={`border-l-4 pl-3 py-1 my-2 italic ${isUser ? 'border-white/50' : 'border-gray-300 text-gray-600'}`}>{children}</blockquote>
                ),
                code: ({ children, className, node, ...rest }) => {
                   const match = /language-(\w+)/.exec(className || '');
                   return match ? (
                     <div className="my-2 rounded bg-gray-800 p-2 text-white overflow-x-auto"><code className={className} {...rest}>{children}</code></div>
                   ) : (
                     <code className={`px-1 py-0.5 rounded font-mono text-xs ${isUser ? 'bg-white/20' : 'bg-gray-100 text-red-500'}`} {...rest}>{children}</code>
                   );
                },
                p: ({ node, ...props }) => <p className="my-1 last:mb-0" {...props} />,
              }}
            >
              {message}
            </ReactMarkdown>
         </div>
      </div>
    </div>
  );
};

// --- 思考中氣泡元件 ---
const ThinkingBubble = () => {
  return (
    <div className="flex w-full mb-6 justify-start animate-in fade-in slide-in-from-bottom-2">
      <div className="flex-shrink-0 mr-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
           <Image src="/avatar5.png" alt="AI" width={36} height={36} className="object-cover" />
        </div>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-4 shadow-sm flex items-center gap-1.5 h-[46px]">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
};

const getInitialMessage = () => {
  return `### 哈囉，我是米諾 (Mino) ~

是魔法學院中的 AI 學習助教，將引導你修習 Excel 魔法技藝，一步步解鎖數據分析的力量。

### 📜 在這座學院中，你將展開以下修行：

* **共 5 個魔法關卡**：對應不同 Excel 核心能力
* **完成試煉**：可獲得星辰徽章與魔力值
* **隨時提問**：你可隨時向我請教 Excel 魔法相關問題
* **圖片解題**：上傳 Excel 截圖或畫面，我將提供更精準的指引

### ✨ 如何召喚 Mino 的協助：

1. **關於課程修行**：詢問當前關卡的概念、技巧與操作邏輯
2. **關於挑戰題**：我可以提供循序漸進的引導和提示
3. **Excel 魔法咒語**：函數、公式，或操作細節，都可向我請教

請問你需要什麼幫助呢？`;
};

export function AIChatAssistant() {
  const pathname = usePathname();
  const { isOpen, toggleChat, isExpanded, toggleExpand } = useChat();
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const geminiReadyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("mino_chat_history");
    if (saved) {
        try {
            const parsed = JSON.parse(saved).map((m: any) => ({...m, timestamp: new Date(m.timestamp)}));
            setChatMessages(parsed);
        } catch(e) {
            setChatMessages([{ id: '1', content: getInitialMessage(), isUser: false, timestamp: new Date() }]);
        }
    } else {
        setChatMessages([{ id: '1', content: getInitialMessage(), isUser: false, timestamp: new Date() }]);
    }

    const initGemini = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (apiKey) {
        try {
          await initializeGemini(apiKey);
          geminiReadyRef.current = true;
        } catch (e) {
          console.error("Gemini init failed", e);
        }
      }
    };
    initGemini();
  }, []);

  useEffect(() => {
    if (chatMessages.length > 0) {
        localStorage.setItem("mino_chat_history", JSON.stringify(chatMessages));
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [chatMessages, isOpen, isThinking]);

  // ✅ 2. 新增：重置對話的函式
  const handleResetChat = () => {
    if (confirm("確定要重新開始對話嗎？目前的聊天紀錄將會被清除。")) {
      const initialMsg: ChatMessage = { 
        id: Date.now().toString(), 
        content: getInitialMessage(), 
        isUser: false, 
        timestamp: new Date() 
      };
      
      setChatMessages([initialMsg]); 
      setChatInput("");              
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      localStorage.removeItem("mino_chat_history"); 
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setImagePreview(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const handleCancelImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  const handlePresetClick = (question: string) => {
    setChatInput(question);
    setTimeout(() => {
      adjustTextareaHeight();
      textareaRef.current?.focus();
    }, 0);
  };

  const handleSendMessage = async () => {
    const content = chatInput.trim();
    const hasImage = !!imagePreview;
    
    if (!content && !hasImage) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content,
      isUser: true,
      timestamp: new Date(),
      imageUrl: imagePreview || undefined
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatInput(""); 
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    setIsThinking(true);

    try {
      const context = chatMessages.slice(-10).map(m => ({ content: m.content, isUser: m.isUser }));
      
      let pageContext = `使用者目前在網站的路徑: ${pathname}。`;

      // 💡 1. 取得學生的學習數據 (需要從你的 Context 或 LocalStorage 獲取)
      // 這裡假設你目前暫時用 LocalStorage 存了一個簡單的 'user_level'，預設為 1
      const userLevelStr = localStorage.getItem('user_level') || '1';
      const userLevel = parseInt(userLevelStr, 10);

      // 💡 2. 判斷單元進度
      if (pathname === '/') {
        pageContext += "這是首頁。";
      } else if (pathname?.includes('/lessons')) {
        const pageText = document.body.innerText || "";
        
        // ... (保留你原本判斷關卡的 if-else 邏輯) ...
        if (pageText.includes('基礎 Excel 魔法觀念')) { 
          pageContext += "當前單元是【關卡1：基礎 Excel 魔法觀念】。";
        } // ... 中間省略 ...

        // 💡 3. 動態設定「鷹架撤除」策略 (Scaffolding Fading)
        if (pathname.includes('/challenge') || pageText.includes('Challenge')) {
          pageContext += "【當前狀態】：使用者正在進行挑戰題。\n";
          
          // 根據等級 (Level) 動態調整 AI 的協助程度
          if (userLevel <= 2) {
            // Level 1-2：高鷹架 (提供詳細步驟引導)
            pageContext += `
            【鷹架策略：高 (Hard Scaffolding)】：
            這是一個初學者。請使用溫和、鼓勵的語氣。
            當學生卡住時，請將問題拆解成多個小步驟，並「主動示範」第一個步驟。
            如果學生詢問公式，可以給出公式的框架 (如：=VLOOKUP(要找什麼, 在哪裡找, ...))。
            絕對不要直接給出完整答案，但要確保學生不會因為太難而感到挫折。
            `;
          } else if (userLevel <= 4) {
            // Level 3-4：中鷹架 (提供線索與反問)
            pageContext += `
            【鷹架策略：中 (Soft Scaffolding / Fading)】：
            這是一位有一定基礎的學生。請使用引導式的語氣。
            當學生卡住時，**不要直接給出步驟**。請使用「反問法」引導他們思考。
            例如：「你覺得這裡應該用哪個函數來計算總和呢？」或「如果出現 #N/A 錯誤，通常是因為找不到資料，你要不要檢查一下搜尋範圍？」
            只給予觀念上的提示，讓學生自己寫出公式。
            `;
          } else {
            // Level 5 以上：低/無鷹架 (鼓勵自主探索)
            pageContext += `
            【鷹架策略：撤除 (Faded Scaffolding)】：
            這是一位高階學生。請扮演一個「點撥者」的角色。
            不要給出任何具體的公式框架或步驟。
            當學生提問時，請用簡短、啟發性的反問回應。例如：「試著回想一下 VLOOKUP 的第四個參數是什麼意思？」
            除非學生明確表達「完全不知道怎麼辦」或連續錯誤兩次以上，否則請保持最低限度的介入。
            `;
          }
        } else {
          pageContext += "使用者正在瀏覽此關卡的「課程內容」。可以提供一般性的概念解釋。";
        }
      }

      const response = await getChatResponse(newMessage.content, { context, lessonInfo: pageContext }, newMessage.imageUrl);
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error("AI Error:", error);
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: "抱歉，連線出了點問題，請稍後再試。",
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <>
      {/* 懸浮按鈕 */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in zoom-in duration-300">
          <Button 
            onClick={toggleChat}
            // ✅ 修改：邊框顏色改為紫色
            className="w-39 h-39 rounded-full bg-white shadow-xl border-2 border-purple-600/20 hover:border-purple-600 hover:scale-110 transition-all p-0 overflow-hidden group"
          >
             <Image 
               src="/avatar5.png" 
               alt="Chat" 
               width={64} 
               height={64} 
               className="object-cover w-full h-full" 
             />
             <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
          </Button>
        </div>
      )}

      <div 
        className={`fixed inset-y-0 right-0 z-[9999] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200 flex flex-col
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          ${isExpanded ? "w-full md:w-[700px]" : "w-full md:w-[530px]"}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b bg-[#F8F9FB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
              <Image src="/avatar5.png" alt="Mino" width={40} height={40} className="object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Mino</h3>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> 
                在線中
              </p>
            </div>
          </div>
          <div className="flex gap-1 items-center">
            {/* ✅ 3. 插入刷新按鈕 */}
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleResetChat} 
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="重新開始對話"
            >
                <RotateCcw className="w-5 h-5" />
            </Button>

            {/* 分隔線 */}
            <div className="w-px h-4 bg-gray-300 mx-1 hidden md:block"></div>

            <Button variant="ghost" size="icon" onClick={toggleExpand} className="hidden md:flex text-gray-500">
                {isExpanded ? <ChevronLeft className="rotate-180"/> : <ChevronLeft />}
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleChat} className="text-gray-500 hover:bg-gray-100">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4 bg-gray-50">
           <div className="space-y-4 pb-2">
             {chatMessages.map(msg => (
               <ChatMessageItem key={msg.id} message={msg.content} isUser={msg.isUser} imageUrl={msg.imageUrl} />
             ))}
             {isThinking && <ThinkingBubble />}
             <div ref={chatEndRef} />
           </div>
        </ScrollArea>

        <div className="p-4 border-t bg-white">
          {imagePreview && (
            <div className="mb-2 relative w-fit">
              <Image src={imagePreview} alt="Preview" width={100} height={80} className="rounded border" />
              <button onClick={handleCancelImage} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5"><X className="w-3 h-3"/></button>
            </div>
          )}

          {/* 預設問題按鈕 */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
            {PRESET_QUESTIONS.map((q, index) => (
              <button
                key={index}
                onClick={() => handlePresetClick(q)}
                disabled={isThinking}
                // ✅ 修改：按鈕 hover 顏色改為紫色
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-purple-600 hover:text-white transition-colors border border-gray-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3 h-3" />
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
             <input type="file" accept="image/*" onChange={handleImageUpload} ref={fileInputRef} className="hidden" id="global-chat-upload" />
             {/* ✅ 修改：圖示 hover 顏色改為紫色 */}
             <label htmlFor="global-chat-upload" className={`p-2 text-gray-400 hover:text-purple-600 cursor-pointer transition-colors ${isThinking ? 'pointer-events-none opacity-50' : ''}`}>
               <ImageIcon className="w-6 h-6" />
             </label>

             <div className="flex-1">
               <textarea 
                 ref={textareaRef}
                 placeholder="輸入問題... (Shift+Enter 換行)" 
                 value={chatInput}
                 onChange={(e) => {
                   setChatInput(e.target.value);
                   adjustTextareaHeight();
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault(); 
                       if (!isThinking) handleSendMessage();
                   }
                 }}
                 rows={1}
                 disabled={isThinking}
                 // ✅ 修改：focus ring 顏色改為紫色
                 className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all resize-none min-h-[44px] max-h-[150px] overflow-y-auto disabled:bg-gray-100 text-base text-sm"
               />
             </div>
             
             <Button 
               onClick={() => handleSendMessage()} 
               disabled={isThinking || (!chatInput.trim() && !imagePreview)}
               // ✅ 修改：按鈕背景改為紫色
               className="bg-purple-600 hover:bg-purple-700 w-8 h-8 p-0 rounded-xl flex-shrink-0 disabled:bg-gray-300"
            >
               <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}