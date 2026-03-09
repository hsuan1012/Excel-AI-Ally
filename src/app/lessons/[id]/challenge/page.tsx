"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, HelpCircle, XCircle, Bot, Trophy, Star, Flame, 
  ChevronLeft, ChevronRight, FileSpreadsheet
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from "next/link";
import { getProgress, updateLessonProgress } from '@/lib/progress';
import { saveLearningRecord, saveLearningAnalytics } from '@/lib/supabase';
import { useChat } from "@/context/ChatContext";

// --- Styles Injection (新野獸派風格 - 與課程頁一致) ---
// ✅ 加了這行判斷，解決 "document is not defined" 錯誤
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* 背景網點裝飾 */
    .neo-bg-pattern {
      background-color: #f8f9fa;
      background-image: radial-gradient(#000 1px, transparent 1px);
      background-size: 32px 32px;
    }

    /* 新野獸派容器 */
    .neo-card {
      background: #fff;
      border: 3px solid #000;
      box-shadow: 6px 6px 0px 0px #000;
      border-radius: 12px;
      transition: all 0.2s ease;
    }

    /* 輸入框 */
    .neo-input {
      border: 3px solid #000;
      background: #fff;
      box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.1);
      border-radius: 8px;
      padding: 0.75rem 1rem;
      width: 100%;
      outline: none;
      font-weight: 700;
      transition: all 0.2s;
    }
    .neo-input:focus {
      box-shadow: 6px 6px 0px 0px #000;
      transform: translate(-2px, -2px);
    }

    /* 通用按鈕 */
    .neo-btn {
      border: 3px solid #000;
      box-shadow: 4px 4px 0px 0px #000;
      font-weight: 900;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.1s;
    }
    .neo-btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px 0px #000;
    }
    .neo-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 0px 0px 0px 0px #000;
    }
    .neo-btn:disabled {
      background-color: #e5e7eb;
      color: #9ca3af;
      border-color: #9ca3af;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    /* Markdown Styles */
    .neo-prose p { margin-bottom: 0.75rem; line-height: 1.7; font-weight: 500; color: #111; }
    .neo-prose code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; border: 1px solid #000; font-family: monospace; color: #d63384; font-weight: bold; }
    /* 白色背景，黑色文字 */
    .neo-prose pre { background: #fff; color: #000; padding: 1rem; border-radius: 8px; border: 3px solid #000; overflow-x: auto; margin-bottom: 1rem; }
    .neo-prose table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; border: 2px solid #000; }
    .neo-prose th { background: #FFD233; border: 2px solid #000; padding: 0.5rem; text-align: left; font-weight: 900; }
    .neo-prose td { border: 2px solid #000; padding: 0.5rem; }
  `;
  document.head.appendChild(style);
}

// --- 資料結構定義 ---
type PracticeExercise = {
  question: string;
  answer: string;
  explanation: string;
  options?: string[];
};

type Lesson = {
  id: string;
  title: string | null;
  number: number | null;
  description: string | null;
};

type ExerciseState = {
  userAnswer: string;
  isSubmitted: boolean;
  isCorrect: boolean;
  showExplanation: boolean;
};

const formatContent = (content: string) => {
  if (!content) return "";
  return content.replace(/\\n/g, '\n');
};

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  
  const { isOpen, isExpanded } = useChat();

  const lessonId = useMemo(() => {
    const id = params?.id;
    return Array.isArray(id) ? id[0] : id;
  }, [params?.id]);

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<PracticeExercise[]>([]);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>([]);
  const [mistakeCounts, setMistakeCounts] = useState<Record<number, number>>({});
  
  const [loading, setLoading] = useState(true);
  const [totalLessons, setTotalLessons] = useState(0);
  const [isAlreadyDone, setIsAlreadyDone] = useState(false); // 🌟 新增：記錄是否已通關過

  const [progressState, setProgressState] = useState({
    level: 1,
    exp: 0,
    stars: 0,
    streak: 1,
    completedLessons: [] as string[],
    dailyProgress: 0,
    dailyGoal: 300,
  });

  // 初始化進度
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const progress = getProgress();
      setProgressState({
        level: progress.level || 1,
        exp: progress.exp || 0,
        stars: progress.stars || 0,
        streak: progress.streak || 1,
        completedLessons: progress.completedLessons || [],
        dailyProgress: progress.dailyProgress || 0,
        dailyGoal:300,
      });
    }
  }, []);

  // 取得總課程數
  useEffect(() => {
    const fetchTotalCount = async () => {
      const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
      if (count !== null) setTotalLessons(count);
    };
    fetchTotalCount();
  }, [supabase]);

  // 紀錄開始時間
  useEffect(() => {
    if (lessonId) {
      const startTimeKey = `lesson_${lessonId}_start_time`;
      if (!localStorage.getItem(startTimeKey)) {
        localStorage.setItem(startTimeKey, new Date().toISOString());
      }
    }
  }, [lessonId]);

  // 抓取資料
  useEffect(() => {
    const fetchData = async () => {
      if (!lessonId) return;
      setLoading(true);

      try {
        const { data: currentLessonData } = await supabase
          .from("lessons")
          .select("*")
          .eq("id", lessonId)
          .maybeSingle();

        if (currentLessonData) {
          setLesson({
            id: currentLessonData.id,
            title: currentLessonData.title,
            number: currentLessonData.number,
            description: currentLessonData.description,
          });

          // 🌟 判斷是否以前就通關過
          const progress = getProgress();
          const done = progress.completedLessons?.includes(lessonId) || false;
          setIsAlreadyDone(done);

          let parsedExercises: PracticeExercise[] = [];
          if (currentLessonData.practice_exercises) {
            parsedExercises = typeof currentLessonData.practice_exercises === 'string' 
              ? JSON.parse(currentLessonData.practice_exercises) 
              : currentLessonData.practice_exercises;
          }

          setExercises(parsedExercises);
          setExerciseStates(parsedExercises.map((ex) => ({
            // 🌟 如果是回訪者，直接填入正確答案並設為已完成，否則維持空白
            userAnswer: done ? ex.answer : "",
            isSubmitted: done,
            isCorrect: done,
            showExplanation: done
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [lessonId, supabase]);

  const handleInputChange = (index: number, value: string) => {
    setExerciseStates(prev => {
      const newStates = [...prev];
      newStates[index] = { ...newStates[index], userAnswer: value, isSubmitted: false };
      return newStates;
    });
  };

  const saveAnalyticsReport = async () => {
    if (!lessonId) return;

    const studentId = localStorage.getItem('student_id') || 'guest';
    const totalCount = exercises.length;
    const totalMistakes = Object.values(mistakeCounts).reduce((a, b) => a + b, 0);
    const accuracy = totalCount > 0 ? totalCount / (totalCount + totalMistakes) : 0;

    const wrongTypes: string[] = exercises
      .map((ex, i) => {
        const count = mistakeCounts[i] || 0;
        if (count === 0) return null;
        const match = ex.question.match(/\b(SUM|AVERAGE|COUNT|VLOOKUP|IF|MAX|MIN)\b/); 
        const fallbackMatch = ex.question.match(/[A-Z]{2,}/);
        const label = match ? match[0] : (fallbackMatch ? fallbackMatch[0] : "基本操作");
        return label;
      })
      .filter((item): item is string => item !== null);

    const startTimeKey = `lesson_${lessonId}_start_time`;
    const startedAt = localStorage.getItem(startTimeKey);
    const timeSpent = startedAt 
      ? Math.floor((new Date().getTime() - new Date(startedAt).getTime()) / 1000)
      : 60;

    let interactionCount = 0;
    let chatHistory = [];
    try {
        const historyRaw = localStorage.getItem("mino_chat_history");
        if (historyRaw) {
            chatHistory = JSON.parse(historyRaw);
            interactionCount = Math.max(0, chatHistory.length - 1);
        }
    } catch(e) {}

    try {
      await saveLearningAnalytics({
        student_id: studentId,
        lesson_id: lessonId,
        time_spent_seconds: timeSpent,
        accuracy_rate: accuracy,
        wrong_types: wrongTypes,
        ai_interaction_count: interactionCount,
        ai_chat_history: chatHistory 
      });
      console.log("學習行為分析報告上傳成功！");
    } catch (error) {
      console.error("儲存分析失敗:", error);
    }
  };

  const handleSubmit = async (index: number) => {
    if (!lessonId) return;

    const exercise = exercises[index];
    const currentState = exerciseStates[index];
    const userAnswerTrimmed = currentState.userAnswer.trim().replace(/\s+/g, '').toLowerCase();
    const correctAnswerTrimmed = exercise.answer.trim().replace(/\s+/g, '').toLowerCase();
    const isCorrect = userAnswerTrimmed === correctAnswerTrimmed;

    if (!isCorrect) {
      setMistakeCounts(prev => ({
        ...prev,
        [index]: (prev[index] || 0) + 1
      }));
    }

    setExerciseStates(prev => {
      const newStates = [...prev];
      newStates[index] = {
        ...newStates[index],
        isSubmitted: true,
        isCorrect: isCorrect,
        showExplanation: true 
      };
      return newStates;
    });

    if (isCorrect) {
        const newProgress = updateLessonProgress(lessonId, 10, 20);
        setProgressState(prev => ({
            ...prev,
            stars: newProgress.stars,
            exp: newProgress.exp,
            level: newProgress.level,
            completedLessons: newProgress.completedLessons,
            dailyProgress: newProgress.dailyProgress
        }));

        const studentId = localStorage.getItem('student_id') || 'guest';
        const studentName = localStorage.getItem('student_name') || 'Guest User';
        const startTimeKey = `lesson_${lessonId}_start_time`;
        let startedAt = localStorage.getItem(startTimeKey);
        if (!startedAt) startedAt = new Date().toISOString();

        try {
          await saveLearningRecord({
            student_id: studentId,
            student_name: studentName,
            lesson_id: lessonId, 
            started_at: startedAt,
            completed_at: new Date().toISOString(),
            answer_attempts: 1, 
            time_spent_seconds: 60 
          });
        } catch (error) {
          console.error("Failed to save progress to DB:", error);
        }
    }
  };

  const allCorrect = exercises.length > 0 && exerciseStates.length > 0 && exerciseStates.every(state => state.isCorrect);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 neo-bg-pattern">
      <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
    </div>
  );

  return (
    <div className="min-h-screen neo-bg-pattern text-slate-900 pb-20">
      
      {/* Header - 更新為 Level / XP / Stars (與課程頁一致) */}
      <header className="sticky top-0 z-50 bg-white border-b-2 border-black">
        <div className="container mx-auto h-20 flex items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-black text-white p-2 rounded-lg border-2 border-black group-hover:bg-purple-600 transition-colors">
               <Bot className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black uppercase tracking-tighter hidden md:block">
              Excel <span className="text-purple-600">AI Ally</span>
            </span>
          </Link>

          <div className="flex items-center gap-3 md:gap-4">
            {/* 1. 法術熟練等級 (Level) */}
            <div className="hidden md:flex items-center gap-2 bg-yellow-300 border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_#000]">
              <Trophy className="h-4 w-4 text-black" />
              <span className="font-bold text-sm">LV.{progressState.level}</span>
            </div>

            {/* 2. 今日修行目標 (Daily Progress) */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <Flame className="h-4 w-4 text-red-500 fill-red-500" />
              <span className="font-bold text-sm text-gray-900">
                {progressState.dailyProgress}/{progressState.dailyGoal} XP
              </span>
            </div>

            {/* 3. 星辰徽章數量 (Stars) */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-sm text-gray-900">{progressState.stars}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8 flex flex-col gap-6 flex-grow">
        <div className={`max-w-6xl mx-auto w-full transition-all duration-300 ${isOpen ? (isExpanded ? 'mr-[630px]' : 'mr-[480px]') : ''}`}>
          
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href={`/lessons/${lessonId || ''}`} className="neo-btn bg-white text-black px-4 py-2 text-sm border-2 h-10 shadow-[2px_2px_0px_0px_#000]">
                <ChevronLeft className="h-4 w-4 mr-1" /> 回到課程
              </Link>
            </div>
            
            <div className="neo-card p-6 bg-white border-l-[8px] border-l-purple-500 mb-6">
              <h1 className="text-3xl md:text-4xl font-black mb-2 text-black uppercase tracking-tight">挑戰題：{lesson?.title}</h1>
              <p className="text-base md:text-lg text-gray-700 font-bold border-l-4 border-gray-300 pl-3">運用你學到的知識來解決這些問題！</p>
            </div>
          </div>

          <div className="space-y-8">
            {exercises.length === 0 ? (
              <div className="neo-card p-12 text-center border-dashed border-4 border-gray-300">
                <HelpCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900">暫無挑戰題</h3>
                <p className="font-medium text-gray-500">本課程目前沒有設定挑戰題，請稍後再回來查看。</p>
              </div>
            ) : (
              exercises.map((ex, i) => {
                const state = exerciseStates[i] || { userAnswer: "", isSubmitted: false, isCorrect: false, showExplanation: false };
                return (
                  <div key={i} className="neo-card overflow-hidden">
                    <div className="bg-gray-100 p-4 border-b-3 border-black flex justify-between items-center">
                      <span className="font-black text-blue-600 flex items-center text-lg">
                        <span className="bg-black text-white w-8 h-8 rounded-lg border-2 border-black flex items-center justify-center mr-3 text-sm shadow-[2px_2px_0px_0px_#ccc]">Q{i + 1}</span>
                        問題 {i + 1}
                      </span>
                      <div className="flex items-center gap-3 text-sm font-bold">
                        <div className="flex items-center text-black bg-yellow-300 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                          <Star className="w-3.5 h-3.5 mr-1 fill-black" /> +10
                        </div>
                        <div className="flex items-center text-white bg-blue-600 px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                          <Trophy className="w-3.5 h-3.5 mr-1" /> +20 XP
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="text-gray-900 text-lg font-medium neo-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}
                          components={{
                            table: ({children}: any) => <div className="overflow-x-auto mb-4 border-2 border-black rounded-lg"><table className="min-w-full divide-y divide-black">{children}</table></div>,
                            th: ({children}: any) => <th className="px-4 py-3 text-left text-xs font-black text-black uppercase tracking-wider border-r-2 border-black last:border-r-0 bg-yellow-300">{children}</th>,
                            td: ({children}: any) => <td className="px-4 py-3 text-sm text-gray-900 border-r-2 border-black last:border-r-0 bg-white border-t-2 border-black">{children}</td>,
                          }}
                        >
                          {formatContent(ex.question)}
                        </ReactMarkdown>
                      </div>

                      <div className="space-y-4 pt-4 border-t-2 border-black border-dashed">
                        <label className="text-sm font-black text-black uppercase block bg-gray-200 inline-block px-2 py-1 rounded border border-black">您的答案</label>
                        <div className="flex gap-3 flex-col sm:flex-row">
                          <input 
                            placeholder="在此輸入答案..." 
                            value={state.userAnswer}
                            onChange={(e) => handleInputChange(i, e.target.value)}
                            className={`neo-input text-lg h-14 ${state.isSubmitted ? (state.isCorrect ? "bg-green-100 border-green-600" : "bg-red-50 border-red-500") : ""}`}
                            disabled={state.isCorrect} 
                            onKeyDown={(e) => e.key === 'Enter' && !state.isCorrect && handleSubmit(i)}
                          />
                          <Button 
                            onClick={() => handleSubmit(i)}
                            disabled={!state.userAnswer.trim() || state.isCorrect}
                            className={`h-14 px-8 text-lg neo-btn border-black ${state.isCorrect ? "bg-[#58CC02] hover:bg-[#46a001] text-white" : "bg-[#2B4EFF] hover:bg-blue-700 text-white"}`}
                          >
                            {state.isCorrect ? "正確" : "提交"}
                          </Button>
                        </div>
                        {state.isSubmitted && (
                          <div className={`flex items-center gap-2 text-base font-black mt-2 p-3 rounded border-2 border-black shadow-[4px_4px_0px_0px_#000] animate-in fade-in ${state.isCorrect ? "bg-green-300 text-black" : "bg-red-300 text-black"}`}>
                            {state.isCorrect ? <><CheckCircle className="w-6 h-6" /> 恭喜答對！</> : <><XCircle className="w-6 h-6" /> 答案不正確</>}
                          </div>
                        )}
                      </div>

                      {state.showExplanation && (
                        <div className={`mt-4 rounded-xl p-6 border-3 border-black shadow-[4px_4px_0px_0px_#000] animate-in fade-in ${state.isCorrect ? "bg-green-50" : "bg-red-50"}`}>
                           <span className="text-xs font-black uppercase tracking-wider block mb-2 bg-black text-white inline-block px-2 py-1 rounded">解析說明</span>
                           <div className="neo-prose">
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatContent(ex.explanation)}</ReactMarkdown>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-6 pb-20 mt-4">
            {/* 🌟 核心修改邏輯：如果是剛好第一次通關（非回訪者）才顯示回到首頁按鈕 */}
            {!isAlreadyDone ? (
              <Button 
                size="lg" 
                className={`
                  px-10 py-6 text-xl font-black rounded-xl border-3 border-black shadow-[6px_6px_0px_0px_#000] text-white flex items-center justify-center gap-2 transition-transform neo-btn
                  ${allCorrect ? "bg-[#58CC02] hover:bg-[#46a001]" : "bg-gray-400 cursor-not-allowed border-gray-600"}
                `}
                disabled={!allCorrect}
                onClick={async () => {
                  try {
                    await saveAnalyticsReport(); 
                  } catch (e) {
                    console.error("上傳失敗，但繼續跳轉", e);
                  }
                  router.push('/');
                }}
              >
                回到首頁<ChevronRight className="h-6 w-6" /> 
              </Button>
            ) : (
              // 🌟 如果已經是完成過的挑戰，顯示過關標籤與返回連結
              <div className="flex flex-col items-end gap-3">
                <div className="bg-green-400 text-black border-3 border-black py-3 px-6 text-lg font-black shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" /> ✨ 您已完成此挑戰題 ✨
                </div>
                <Link href="/" className="neo-btn bg-white text-black px-6 py-2 border-2 text-sm font-bold shadow-[2px_2px_0px_0px_#000]">
                  返回首頁
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}