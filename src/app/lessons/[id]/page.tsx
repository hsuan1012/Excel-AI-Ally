"use client"

import React, { useState, useEffect, useRef, use, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Star, MessageCircle, ChevronRight, ChevronLeft, FileSpreadsheet, Bot, Trophy, Flame, X, Gift, CheckCircle, XCircle, KeyRound, Zap, Send, MousePointerClick, BookOpen, RotateCcw, Clock } from 'lucide-react'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { State } from '@/types/lesson'
import { getProgress, updateLessonProgress } from '@/lib/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { saveLearningRecord, saveLeaderboardEntry, getPlayerRank, getLeaderboardStats, supabase, getGeniallyLink, getLessonMarkdownContent } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'

// --- Styles Injection (新野獸派風格) ---
// --- Styles Injection (新野獸派風格) ---
// 👇 新增這一行判斷，確保只在瀏覽器端執行
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

    /* Tab Trigger Active State Customization */
    .neo-tab[data-state="active"] {
      background-color: #FFD233;
      color: black;
      border: 3px solid black;
      box-shadow: 4px 4px 0px 0px #000;
      transform: translate(-2px, -2px);
    }
    .neo-tab {
      border: 3px solid transparent; 
      font-weight: 800;
    }

    /* Markdown Styles */
    .neo-prose h1 { font-size: 2rem; font-weight: 900; margin-bottom: 1.5rem; text-transform: uppercase; border-bottom: 4px solid #000; padding-bottom: 0.5rem; }
    .neo-prose h2 { font-size: 1.5rem; font-weight: 800; margin-top: 2rem; margin-bottom: 1rem; color: #2563eb; }
    .neo-prose p { margin-bottom: 1rem; line-height: 1.7; font-weight: 500; }
    .neo-prose code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: monospace; border: 1px solid #000; }
    /* 修改背景為白色或淺灰，文字改為黑色 */
    .neo-prose pre { background: #ffffff; color: #000; padding: 1rem; border-radius: 8px; border: 3px solid #000; overflow-x: auto; margin-bottom: 1.5rem; }
    .neo-prose ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
    .neo-prose li { margin-bottom: 0.5rem; }
    .neo-prose table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 3px solid #000; }
    .neo-prose th { background: #FFD233; border: 2px solid #000; padding: 0.75rem; text-align: left; font-weight: 900; }
    .neo-prose td { border: 2px solid #000; padding: 0.75rem; }

    /* 隱藏滾動條但保留功能 */
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
    .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
  `;
  document.head.appendChild(style);
} // 👈 記得這裡要有一個右大括號結束

// --- 輔助函式維持不變 ---
const formatExerciseContent = (content: string) => {
  if (content.includes('\\n\\n')) {
    return content.split('\\n\\n').map(line => {
        if (line.includes('|')) return line.replace(/\\n/g, '\n');
        return line;
      }).join('\n\n');
  }
  if (content.includes('|')) return content.replace(/\\n/g, '\n');
  let formattedContent = content.replace(/\\n(\d+)\./g, '\n$1.').replace(/\\n/g, '\n').replace(/(\d+)\.([\S])/g, '$1. $2');
  formattedContent = formattedContent.replace(/=([A-Z]+)\(/g, '=`$1(`').replace(/\)/g, '`)');
  return formattedContent;
};

const formatExplanation = (explanation: string) => {
  if (!explanation) return '';
  let formatted = explanation.replace(/\\n(\d+)\./g, '\n$1.').replace(/\\n/g, '\n').replace(/(\d+)\.([\S])/g, '$1. $2');
  formatted = formatted.replace(/=([A-Z]+)\(([^)]+)\)/g, '`=$1($2)`');
  return formatted;
};

export default function ExcelLearningPlatform({ params }: { params: Promise<{ id: string }> }) {
  const [totalLessons, setTotalLessons] = useState(0); 
  const router = useRouter()
  const resolvedParams = use(params);
  const [showRewardDialog, setShowRewardDialog] = useState(false);
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboardStats, setLeaderboardStats] = useState({ total_participants: 0, fastest_time: '--:--', average_time: '--:--' });
  
  const [lessonState, setLessonState] = useState<State>({
    currentLesson: resolvedParams.id,
    completed: false,
    stars: 0,
    completedLessons: [],
    answer: "",
    hasSubmitted: false,
    isCorrect: false,
    showChat: false, 
    exp: 0,
    level: 1,
    dailyProgress: 0,
    dailyGoal: 300,
    streak: 1
  });

  const [exercisesData, setExercisesData] = useState<Array<{question: string, answer: string, explanation: string}>>([]);
  const [currentExplanation, setCurrentExplanation] = useState<string | null>(null);
  const [answerAttempts, setAnswerAttempts] = useState<number>(0);
  const [lessonMarkdown, setLessonMarkdown] = useState<string | null>(null);
  const [geniallyLink, setGeniallyLink] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);

  type LessonMeta = {
    id: string
    title: string | null
    description: string | null
    content: string | null
    number: number | null
  }

  const [lessons, setLessons] = useState<LessonMeta[]>([])

  const getLessonNumber = (lessonId: string): number => {
    const found = lessons.find(l => l.id === lessonId)
    if (found?.number) return found.number
    const idx = lessons.findIndex(l => l.id === lessonId)
    return idx >= 0 ? idx + 1 : 0
  }

  const getNextLessonId = (currentId: string): string | null => {
    const idx = lessons.findIndex(l => l.id === currentId)
    return idx >= 0 && idx + 1 < lessons.length ? lessons[idx + 1].id : null
  }

  const getPrevLessonId = (currentId: string): string | null => {
    const idx = lessons.findIndex(l => l.id === currentId)
    return idx > 0 ? lessons[idx - 1].id : null
  }

  const fetchExercisesAndProgress = useCallback(async (currentLessonId: string) => {
    try {
      setAnswerAttempts(0);
      setCurrentExplanation(null);
      
      const { data, error } = await supabase.from('lessons').select('practice_exercises').eq('id', currentLessonId).single();
      
      if (error) { console.error('Error fetching exercises:', error.message || error); return; }
      
      let parsedExercises = [];
      if (data && data.practice_exercises) {
        parsedExercises = typeof data.practice_exercises === 'string' ? JSON.parse(data.practice_exercises) : data.practice_exercises;
        setExercisesData(parsedExercises);
      }

      const progress = getProgress();
      const isLessonCompleted = progress.completedLessons.includes(currentLessonId);
      
      if (!isLessonCompleted) {
        const now = new Date();
        const startTimeKey = `lesson_${currentLessonId}_start_time`;
        if (!localStorage.getItem(startTimeKey)) {
            localStorage.setItem(startTimeKey, now.toISOString());
        }
        if (getLessonNumber(currentLessonId) === 1 && !localStorage.getItem('start_time')) {
          localStorage.setItem('start_time', now.toISOString());
        }
      }
      
      setLessonState(prev => ({
        ...prev,
        currentLesson: currentLessonId,
        stars: progress.stars,
        completedLessons: progress.completedLessons,
        hasSubmitted: isLessonCompleted,
        isCorrect: isLessonCompleted,
        answer: prev.currentLesson !== currentLessonId ? "" : prev.answer,
        exp: progress.exp,
        level: progress.level,
        dailyProgress: progress.dailyProgress,
        streak: progress.streak || 1
      }));

      if (isLessonCompleted && parsedExercises.length > 0) {
        setCurrentExplanation(parsedExercises[0].explanation || '');
      }

      // Load global progress for header
      const savedTime = localStorage.getItem('completion_time');
      if (savedTime) setCompletionTime(savedTime);
      const studentId = localStorage.getItem('student_id') || 'guest';
      getPlayerRank(studentId).then(setPlayerRank).catch(console.error);

      if (showRewardDialog) {
        getLeaderboardStats().then(setLeaderboardStats).catch(console.error);
      }

    } catch (error) {
      console.error('Error in fetchExercisesAndProgress:', error);
    }
  }, [showRewardDialog, getLessonNumber]);

  useEffect(() => {
    const fetchTotalCount = async () => {
      const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true });
      if (count !== null) setTotalLessons(count);
    };
    fetchTotalCount();
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (!localStorage.getItem('student_id')) localStorage.setItem('student_id', 'user_' + Math.random().toString(36).substring(2, 10));
    if (!localStorage.getItem('student_name')) localStorage.setItem('student_name', 'Anonymous User');
    const currentLessonId = resolvedParams.id;
    fetchExercisesAndProgress(currentLessonId);
  }, [resolvedParams.id, showRewardDialog, fetchExercisesAndProgress]);

  useEffect(() => {
    const fetchLessonsList = async () => {
      const { data, error } = await supabase.from('lessons').select('id, title, description, content, number').order('number', { ascending: true })
      if (error) { setLessons([]); return; }
      setLessons((data as LessonMeta[]) || [])
    }
    fetchLessonsList()
  }, [])

  useEffect(() => {
      if (lessonState.hasSubmitted && exercisesData.length > 0) {
        setCurrentExplanation(exercisesData[0].explanation || '');
      }
    }, [exercisesData, lessonState.hasSubmitted]);

  useEffect(() => {
    let cancelled = false;
    const fetchGenially = async () => {
      try {
        const link = await getGeniallyLink(lessonState.currentLesson);
        if (!cancelled) setGeniallyLink(link);
      } catch (err) {
        if (!cancelled) setGeniallyLink(null);
      }
    };
    fetchGenially();
    return () => { cancelled = true; };
  }, [lessonState.currentLesson]);

  useEffect(() => {
    const fetchLessonMarkdown = async () => {
      setContentLoading(true);
      try {
        const markdown = await getLessonMarkdownContent(lessonState.currentLesson);
        if (markdown) setLessonMarkdown(markdown);
        else setLessonMarkdown(null);
      } catch (error) {
        setLessonMarkdown(null);
      } finally {
        setTimeout(() => setContentLoading(false), 300);
      }
    };
    fetchLessonMarkdown();
  }, [lessonState.currentLesson]);

  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabsRef.current) {
      const activeValue = getLessonNumber(lessonState.currentLesson) === 5 ? 'game' : 'content';
      const tabsElement = tabsRef.current;
      const activeTab = tabsElement.querySelector(`[data-state="active"]`);
      if (!activeTab) {
        const targetTab = tabsElement.querySelector(`[data-value="${activeValue}"]`);
        if (targetTab instanceof HTMLElement) targetTab.click();
      }
    }
  }, [lessonState.currentLesson]);

  const handleAnswerSubmit = async () => {
    if (!exercisesData || exercisesData.length === 0) return;
    
    const userAnswer = lessonState.answer.trim().toLowerCase();
    const correctAnswer = exercisesData[0].answer.trim().toLowerCase();
    
    const newAttemptCount = answerAttempts + 1;
    setAnswerAttempts(newAttemptCount);
    
    if (getLessonNumber(lessonState.currentLesson) !== 5) {
      const explanation = exercisesData[0].explanation || '';
      setCurrentExplanation(explanation);
    }
    
    setLessonState({ ...lessonState, hasSubmitted: true, isCorrect: userAnswer === correctAnswer });
    
    if (userAnswer === correctAnswer) {
      const now = new Date();
      const utc8Time = new Date(now.toISOString());
      const startTimeKey = `lesson_${lessonState.currentLesson}_start_time`;
      let startTimeStr = localStorage.getItem(startTimeKey);
      
      if (!startTimeStr) {
          startTimeStr = now.toISOString();
          localStorage.setItem(startTimeKey, startTimeStr);
      }
      
      const completionData = { lessonId: lessonState.currentLesson, completedAt: utc8Time.toISOString() };
      const completions = JSON.parse(localStorage.getItem('completions') || '[]');
      completions.push(completionData);
      localStorage.setItem('completions', JSON.stringify(completions));
      
      let timeSpentSeconds = 0;
      if (startTimeStr) {
        const startTime = new Date(startTimeStr.replace('+08:00', 'Z'));
        timeSpentSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        
        const minutes = Math.floor(timeSpentSeconds / 60);
        const seconds = timeSpentSeconds % 60;
        const formattedTime = `${minutes}分${seconds}秒`;
        localStorage.setItem('completion_time', formattedTime);
        setCompletionTime(formattedTime); // Update header immediately
        
        const studentId = localStorage.getItem('student_id') || 'guest';
        const studentName = localStorage.getItem('student_name') || 'Guest User';
        const lessonNumber = getLessonNumber(lessonState.currentLesson);
        
        try {
            await saveLearningRecord({
              student_id: studentId, 
              student_name: studentName, 
              lesson_id: lessonState.currentLesson,
              started_at: startTimeStr, 
              completed_at: utc8Time.toISOString(),
              time_spent_seconds: timeSpentSeconds, 
              answer_attempts: newAttemptCount
            });
        } catch (e) {
            console.error("Error saving learning record:", e);
        }

        if (lessonNumber === 5) {
          const globalStart = localStorage.getItem('start_time');
          if (globalStart) {
             const globalStartDate = new Date(globalStart);
             const totalSeconds = Math.floor((now.getTime() - globalStartDate.getTime()) / 1000);
             const totalMinutes = Math.floor(totalSeconds / 60);
             const totalSecs = totalSeconds % 60;
             const totalFormatted = `${totalMinutes}分${totalSecs}秒`;
             localStorage.setItem('completion_time', totalFormatted);
             setCompletionTime(totalFormatted); // Update header
             
             try {
                 await saveLeaderboardEntry({
                     student_id: studentId, 
                     student_name: studentName, 
                     completion_time_seconds: totalSeconds,
                     completion_time_string: totalFormatted, 
                     completed_at: utc8Time.toISOString(), 
                     stars_earned: 50
                 });
             } catch (e) {
                 console.error("Error saving leaderboard:", e);
             }
          }
        }
      }
      const updatedProgress = updateLessonProgress(lessonState.currentLesson, 10, 20);
      setLessonState(prev => ({...prev, stars: updatedProgress.stars})); // Update header stars
    }
  };

  const handleNextLesson = () => {
    const nextId = getNextLessonId(lessonState.currentLesson);
    if (nextId) router.push(`/lessons/${nextId}`);
  };

  const handlePrevLesson = () => {
    const prevId = getPrevLessonId(lessonState.currentLesson);
    if (prevId) router.push(`/lessons/${prevId}`);
  };

  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLessonState(prev => ({ ...prev, answer: e.target.value, ...(prev.hasSubmitted && !prev.isCorrect ? { hasSubmitted: false, isCorrect: false } : {}) }));
  };

  const currentLesson = lessons.find(lesson => lesson.id === lessonState.currentLesson);
  const lessonNumber = getLessonNumber(lessonState.currentLesson);
  const showTabs = lessonNumber === 5 ? ['game'] : lessonNumber === 0 ? ['content'] : ['practice', 'content'];

  // Check if all lessons completed for rank display
  const isAllCompleted = lessonState.completedLessons.length >= totalLessons;

  const handleContinue = () => {
    if (getLessonNumber(lessonState.currentLesson) === 5) {
      setShowRewardDialog(true);
    } else {
      handleNextLesson();
    }
  };

  const handleRewardClaim = () => {
    if (lessonState.stars >= 50) {
      const updatedProgress = updateLessonProgress(lessonState.currentLesson, -50, 0);
      setLessonState(prev => ({ ...prev, stars: updatedProgress.stars }));
      setShowRewardDialog(false);
      window.location.href = 'https://www.surveycake.com/s/QMkxK';
    }
  };

  const renderQuestion = () => {
    if (exercisesData.length === 0) return null;
    return (
      <div className="bg-white border-2 border-black rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#58CC02] border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-xl mb-3">您的答案</h3>
            <div className="space-y-4">
              <input type="text" value={lessonState.answer} onChange={handleAnswerChange} className="neo-input text-lg" placeholder="輸入您的答案..." disabled={lessonState.hasSubmitted && lessonState.isCorrect} />
              
              {lessonState.hasSubmitted && (
                <div className={`p-4 rounded-xl border-3 border-black shadow-[4px_4px_0px_0px_#000] ${lessonState.isCorrect ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'}`}>
                  <div className="flex items-center gap-2 mb-2 font-black text-lg">
                    {lessonState.isCorrect ? <><Star className="h-6 w-6 fill-yellow-400 text-black" /><span>CORRECT! +10 Stars</span></> : <><XCircle className="h-6 w-6 text-red-600" /><span>WRONG ANSWER</span></>}
                  </div>
                  {currentExplanation && (
                    <div className="mt-3 p-4 bg-white border-2 border-black rounded-lg text-gray-900">
                      <h4 className="font-black mb-2 uppercase text-sm bg-black text-white inline-block px-2 py-1 rounded">Explanation</h4>
                      <div className="prose prose-sm max-w-none neo-prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatExplanation(currentExplanation)}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <Button onClick={lessonState.isCorrect ? handleContinue : handleAnswerSubmit} className={`w-full py-6 text-xl rounded-xl ${lessonState.hasSubmitted && lessonState.isCorrect ? 'neo-btn bg-[#58CC02] hover:bg-[#4ade80] text-white border-black' : 'neo-btn bg-[#2B4EFF] hover:bg-[#60a5fa] text-white border-black'}`} disabled={!lessonState.isCorrect && !lessonState.answer.trim()}>
                {lessonState.hasSubmitted && lessonState.isCorrect ? '繼續 NEXT' : '檢查答案 CHECK'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFinalQuestion = () => {
    if (!exercisesData || exercisesData.length === 0) return null;
    return (
      <div className="bg-white rounded-xl p-6 border-3 border-black shadow-[6px_6px_0px_0px_#000]">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="flex items-center mb-6 pb-4 border-b-2 border-black">
              <div className="w-12 h-12 rounded-lg bg-[#2B4EFF] border-2 border-black flex items-center justify-center flex-shrink-0 mr-4 shadow-[2px_2px_0px_0px_#000]"><KeyRound className="h-6 w-6 text-white" /></div>
              <h3 className="font-black text-2xl uppercase">終極密碼 Final Code</h3>
            </div>
            {lessonState.hasSubmitted && lessonState.isCorrect && <div className="p-4 rounded-xl mb-6 bg-[#dcfce7] border-3 border-black shadow-[4px_4px_0px_0px_#000]"><div className="flex items-center"><CheckCircle className="h-6 w-6 text-black mr-2" /><p className="font-black text-lg">答案正確！ CORRECT!</p></div></div>}
            {lessonState.hasSubmitted && !lessonState.isCorrect && <div className="p-4 rounded-xl mb-6 bg-[#fee2e2] border-3 border-black shadow-[4px_4px_0px_0px_#000]"><div className="flex items-center"><XCircle className="h-6 w-6 text-black mr-2" /><p className="font-black text-lg">答案不正確 TRY AGAIN</p></div></div>}
            <div className="space-y-6">
              <div className="flex flex-col">
                <label htmlFor="answer" className="font-bold text-black uppercase mb-2 ml-1">輸入你的答案：</label>
                <div className="relative"><input id="answer" type="text" className="neo-input text-xl h-14" placeholder="在此輸入答案..." value={lessonState.answer} onChange={handleAnswerChange} disabled={lessonState.hasSubmitted && lessonState.isCorrect} /></div>
              </div>
              {!lessonState.hasSubmitted || !lessonState.isCorrect ? 
                <button className="w-full h-14 neo-btn bg-[#2B4EFF] text-white text-xl" onClick={handleAnswerSubmit} disabled={!lessonState.answer.trim()}>提交答案 SUBMIT</button> 
                : (lessonState.isCorrect && <button className="w-full h-14 neo-btn bg-[#58CC02] text-white text-xl" onClick={handleContinue}>完成課程 FINISH</button>)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen neo-bg-pattern text-slate-900 pb-20">
      
      {/* Header */}
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
            {/* 1. 法術熟練等級 (Level) - 黃色膠囊風格 */}
            <div className="hidden md:flex items-center gap-2 bg-yellow-300 border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_#000]">
              <Trophy className="h-4 w-4 text-black" />
              <span className="font-bold text-sm">LV.{lessonState.level}</span>
            </div>

            

            {/* 3. 星辰徽章數量 (Stars) - 白色方塊+黃色星星 */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-sm text-gray-900">{lessonState.stars}</span>
            </div>

            {/* 2. 今日修行目標  (Daily Progress) - 白色方塊+紅色火焰 */}
            <div className="flex items-center gap-1.5 bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <Flame className="h-4 w-4 text-red-500 fill-red-500" />
              <span className="font-bold text-sm text-gray-900">
                {lessonState.dailyProgress}/{lessonState.dailyGoal} XP
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row gap-4 md:gap-6 flex-grow">
        <main className="w-full max-w-6xl mx-auto">
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/" className="neo-btn bg-white text-black px-4 py-2 text-sm border-2 h-10 shadow-[2px_2px_0px_0px_#000]">
                <ChevronLeft className="h-4 w-4 mr-1" /> 回到首頁
              </Link>
            </div>
            
            
          </div>

          <Tabs ref={tabsRef} defaultValue={lessonNumber === 5 ? 'game' : 'content'} className="mb-6 md:mb-8">
            {lessonNumber !== 0 && (
            <TabsList className="grid w-full gap-4 mb-6 bg-transparent h-auto" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <TabsTrigger value="content" className="neo-tab h-14 rounded-xl border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-gray-100 data-[state=active]:bg-[#FFD233] data-[state=active]:shadow-none data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px]">
                 <BookOpen className="w-5 h-5 mr-2" /> 課程內容 CONTENT
              </TabsTrigger>
              <TabsTrigger value="practice" className="neo-tab h-14 rounded-xl border-2 border-black bg-white text-black shadow-[4px_4px_0px_0px_#000] transition-all hover:bg-gray-100 data-[state=active]:bg-[#FFD233] data-[state=active]:shadow-none data-[state=active]:translate-x-[2px] data-[state=active]:translate-y-[2px]">
                 <Zap className="w-5 h-5 mr-2" /> 挑戰題 PRACTICE
              </TabsTrigger>
            </TabsList>
            )}
            
            {showTabs.includes('content') && (
              <TabsContent value="content">
                <div className="neo-card overflow-hidden">
                  <div className="bg-blue-600 border-b-3 border-black p-4 flex justify-between items-center">
                     <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="h-6 w-6" /> 課程內容
                     </h2>
                  </div>
                  <div className="pt-0 px-8 pb-8 bg-white">
                    {contentLoading ? (
                      <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 rounded w-1/2 border-2 border-gray-300"></div>
                        <div className="h-4 bg-gray-200 rounded w-full border border-gray-300"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 border border-gray-300"></div>
                        <div className="h-32 bg-gray-200 rounded border-2 border-gray-300"></div>
                      </div>
                    ) : (
                      <div className="neo-prose">
                        {lessonMarkdown ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonMarkdown}</ReactMarkdown> : isClient && currentLesson?.content ? <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} /> : <p>課程內容加載失敗，請刷新頁面重試。</p>}
                      </div>
                    )}
                    
                    <div className="mt-12 pt-8 border-t-4 border-black border-dashed">
                      <h3 className="text-2xl font-black mb-6 uppercase bg-yellow-300 inline-block px-2 border-2 border-black transform -rotate-1">互動教材</h3>
                      {geniallyLink ? (
                        <div 
                          className="genially-container group relative w-full mx-auto max-w-[1200px] border-4 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_#000]"
                          onMouseLeave={(e) => {
                            const iframe = e.currentTarget.querySelector('iframe');
                            if (iframe) iframe.style.pointerEvents = 'none';
                          }}
                          onClick={(e) => {
                            const iframe = e.currentTarget.querySelector('iframe');
                            if (iframe) iframe.style.pointerEvents = 'auto';
                          }}
                        >
                          <div style={{position: 'relative', paddingBottom: '56.25%', paddingTop: 0, height: 0}}>
                            <iframe 
                            title="Excel Learning" 
                            style={{
                              position: 'absolute', 
                              top: 0, 
                              left: 0, 
                              width: '100%', 
                              height: '100%', 
                              border: 'none', 
                              pointerEvents: 'none',
                              overflow: 'hidden' // 👈 要放在這裡面！
                            }} 
                            src={geniallyLink} 
                            allowFullScreen={true} 
                            loading="lazy" 
                          />
                          
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 bg-gray-100 border-2 border-dashed border-gray-400 rounded-xl text-center font-bold text-gray-500">
                           暫無互動內容
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
            
            {showTabs.includes('practice') && (
              <TabsContent value="practice">
                <div className="neo-card overflow-hidden bg-purple-50">
                  <div className="bg-purple-600 border-b-3 border-black p-4 text-white flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase flex items-center gap-2"><Zap className="h-6 w-6 text-yellow-300 fill-yellow-300" /> Challenge</h2>
                    <div className="flex items-center gap-3">
                       <div className="bg-black px-3 py-1 rounded text-yellow-400 font-bold text-sm border border-yellow-400">+10 Stars</div>
                       <div className="bg-black px-3 py-1 rounded text-blue-400 font-bold text-sm border border-blue-400">+20 XP</div>
                    </div>
                  </div>
                  <div className="p-6 md:p-8">
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-2">
                         <span className="font-bold text-sm uppercase">Progress</span>
                         <span className="font-black bg-black text-white px-2 rounded">{lessonState.hasSubmitted ? "1/1" : "0/1"}</span>
                      </div>
                      <div className="h-4 bg-white border-2 border-black rounded-full overflow-hidden shadow-[2px_2px_0px_0px_#000]">
                         <div className="h-full bg-[#58CC02] transition-all duration-300 border-r-2 border-black" style={{ width: lessonState.hasSubmitted ? '100%' : '0%' }} />
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl p-6 mb-8 border-3 border-black shadow-[6px_6px_0px_0px_#000]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center flex-shrink-0"><FileSpreadsheet className="h-6 w-6 text-white" /></div>
                        <div className="flex-1">
                          <h3 className="font-black text-xl mb-4 border-b-2 border-gray-200 pb-2">題目 Question</h3>
                          {exercisesData.length > 0 ? (
                             <div className="neo-prose">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{formatExerciseContent(exercisesData[0].question)}</ReactMarkdown>
                             </div>
                          ) : (
                             <p className="font-bold text-gray-500">請完成遊戲後，輸入最終答案。</p>
                          )}
                        </div>
                      </div>
                    </div>
                    {renderQuestion()}
                  </div>
                </div>
              </TabsContent>
            )}
            
            <TabsContent value="game" forceMount className={getLessonNumber(lessonState.currentLesson) === 5 ? 'block' : 'hidden'}>
              <div className="neo-card overflow-hidden">
                <div className="bg-red-600 border-b-3 border-black p-4 text-white flex justify-between items-center">
                   <h2 className="text-xl font-black uppercase flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-300" /> Final Game</h2>
                </div>
                <div className="p-6 md:p-8 bg-yellow-50">
                  <div className="space-y-8">
                    <div className="bg-white rounded-xl p-6 border-3 border-black shadow-[6px_6px_0px_0px_#000]">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center flex-shrink-0"><FileSpreadsheet className="h-6 w-6 text-white" /></div>
                        <div className="flex-1">
                           <h3 className="font-black text-xl mb-3">綜合測驗說明 Instructions</h3>
                           <p className="font-bold mb-4">在這測驗中，您需要運用前面學習的所有函數知識來解決實際問題。</p>
                           <ul className="list-disc pl-5 space-y-2 font-medium border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
                              <li>運用 SUM、AVERAGE 函數進行數據統計</li>
                              <li>使用 VLOOKUP 函數查找相關數據</li>
                              <li>使用 IF 函數進行條件判斷</li>
                              <li>創建樞紐分析表進行數據分析</li>
                           </ul>
                           <p className="mt-4 font-black text-blue-600">完成測驗後，您將獲得終極密碼！</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-black p-2 rounded-xl border-3 border-black shadow-[8px_8px_0px_0px_#000]">
                      <div className="genially-container group relative w-full mx-auto max-w-[1200px] rounded-lg overflow-hidden bg-white" onClick={(e) => { const iframe = e.currentTarget.querySelector('iframe'); if (iframe) iframe.style.pointerEvents = 'auto'; }}>
                        <div style={{position: 'relative', paddingBottom: '56.25%', paddingTop: 0, height: 0}}>
                          {geniallyLink ? <iframe title="Excel Learning" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', pointerEvents: 'none'}} src={geniallyLink} allowFullScreen={true} loading="lazy" scrolling="no" /> : <div className="absolute inset-0 flex items-center justify-center bg-gray-100"><p className="font-bold text-xl">遊戲內容正在加載中...</p></div>}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8">
                     {renderFinalQuestion()}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center mt-8">
            <div>
              {lessonNumber !== 0 && (
                <Button variant="outline" className="neo-btn bg-white hover:bg-gray-100 text-black border-2 h-12 px-6" onClick={handlePrevLesson}>
                   <ChevronLeft className="h-5 w-5 mr-2" /> PREV LESSON
                </Button>
              )}
            </div>
            <div className="flex-1 flex justify-end">
              {lessonNumber === 0 ? (
                <Button className="neo-btn bg-[#58CC02] hover:bg-[#46a001] text-white border-black h-14 text-xl px-8 shadow-[4px_4px_0px_0px_#000]" onClick={() => router.push(`/lessons/${lessonState.currentLesson}/challenge`)}>
                   前往挑戰題<ChevronRight className="h-6 w-6 ml-2" />
                </Button>
              ) : (
                lessonNumber !== 5 && (
                  <Button 
                    className={`neo-btn h-12 px-6 ${lessonState.completedLessons.includes(lessonState.currentLesson) ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-[4px_4px_0px_0px_#000]' : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'}`} 
                    onClick={handleNextLesson} 
                    disabled={!lessonState.completedLessons.includes(lessonState.currentLesson)}
                  >
                    NEXT LESSON <ChevronRight className="h-5 w-5 ml-2" />
                  </Button>
                )
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Reward Dialog - Neo Style */}
      <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
        <DialogContent className="neo-card p-0 border-4 border-black sm:max-w-[500px]">
          <div className="bg-[#FF9900] border-b-4 border-black p-5">
             <DialogTitle className="flex items-center gap-3 text-2xl font-black uppercase text-black">
                <Gift className="h-8 w-8 text-white fill-white stroke-black stroke-2" /> 兌換獎勵 REWARD
             </DialogTitle>
          </div>
          
          <div className="p-6 space-y-6 bg-white">
             <div className="space-y-4">
                <div className="p-4 bg-blue-50 border-3 border-black rounded-xl text-center shadow-[4px_4px_0px_0px_#000]">
                   <h3 className="font-black text-xl mb-1">CONGRATULATIONS!</h3>
                   <p className="font-bold text-gray-600">恭喜完成所有課程！</p>
                </div>

                {completionTime && (
                   <div className="space-y-4">
                      <div className="flex items-center justify-between bg-black text-white p-3 rounded-lg border-2 border-black">
                         <span className="font-bold">完成時間</span>
                         <span className="font-mono text-xl font-black text-yellow-400">{completionTime}</span>
                      </div>
                      
                      <div className="bg-gray-100 p-4 rounded-xl border-3 border-black">
                         <h3 className="font-black text-lg mb-3 border-b-2 border-gray-300 pb-2">LEADERBOARD STATS</h3>
                         <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                               <div className="text-xs font-bold text-gray-500 uppercase">Total</div>
                               <div className="font-black text-xl text-blue-600">{leaderboardStats.total_participants}</div>
                            </div>
                            <div>
                               <div className="text-xs font-bold text-gray-500 uppercase">Fastest</div>
                               <div className="font-black text-xl text-green-600">{leaderboardStats.fastest_time}</div>
                            </div>
                            <div>
                               <div className="text-xs font-bold text-gray-500 uppercase">Avg</div>
                               <div className="font-black text-xl text-orange-600">{leaderboardStats.average_time}</div>
                            </div>
                         </div>
                      </div>
                   </div>
                )}
                
                <p className="font-bold text-center border-2 border-dashed border-gray-300 p-2 rounded">
                   使用 <span className="text-yellow-500 font-black text-lg">50</span> 顆星星兌換特別獎勵
                </p>
             </div>

             <div className="space-y-4 pt-4 border-t-2 border-gray-200">
                <div className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-lg">
                   <div className="flex items-center gap-2 font-black uppercase"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500 stroke-black" /> Cost</div>
                   <span className="text-xl font-black">50</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white border-2 border-black rounded-lg">
                   <div className="flex items-center gap-2 font-black uppercase"><Star className="h-5 w-5 text-yellow-500 fill-yellow-500 stroke-black" /> You Have</div>
                   <span className={`text-xl font-black ${lessonState.stars >= 50 ? 'text-green-600' : 'text-red-600'}`}>{lessonState.stars}</span>
                </div>
                
                <Button 
                   onClick={handleRewardClaim} 
                   disabled={lessonState.stars < 50} 
                   className={`w-full py-6 text-xl rounded-xl neo-btn border-black ${lessonState.stars >= 50 ? 'bg-[#FF9900] hover:bg-[#E68A00] text-white' : 'bg-gray-200 text-gray-400 border-gray-400'}`}
                >
                   {lessonState.stars >= 50 ? 'CLAIM REWARD 🎁' : 'NOT ENOUGH STARS'}
                </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}