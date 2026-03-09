"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Bot, Star, Flame, Trophy, RotateCcw, ChevronRight, Lock, BookOpen, User, Loader2, Clock } from "lucide-react"
// ✅ 修改導入：使用真實數據抓取函式
import { getLessons, getRealLeaderboard, getMyRealRank, Lesson, registerStudent } from '@/lib/supabase'
import { getProgress, resetProgress } from '@/lib/progress'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

// --- 型別定義 ---
interface ProgressData {
  completedLessons: string[];
  stars: number;
  streak: number;
  level: number;
  exp: number;
  dailyGoal: number;
  dailyProgress: number;
}

// --- Styles Injection (新野獸派風格 - 保持原樣) ---
// --- Styles Injection (新野獸派風格 - 修正 SSR 錯誤) ---
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .neo-bg-pattern { background-color: #fcfcfc; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 24px 24px; }
    .neo-container { border: 3px solid #000; background: #fff; box-shadow: 6px 6px 0px 0px #000; border-radius: 12px; transition: all 0.2s ease; }
    .neo-container-interactive:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0px 0px #000; }
    .neo-input { border: 2px solid #000; background: #fff; box-shadow: 3px 3px 0px 0px rgba(0,0,0,0.1); transition: all 0.2s; border-radius: 8px; padding: 0.75rem 1rem; width: 100%; outline: none; font-weight: bold; }
    .neo-input:focus { box-shadow: 4px 4px 0px 0px #000; transform: translate(-1px, -1px); }
    .neo-btn { border: 2px solid #000; box-shadow: 4px 4px 0px 0px #000; font-weight: 800; transition: all 0.1s; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; justify-content: center; }
    .neo-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px 0px #000; }
    .neo-btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px 0px #000; }
    .neo-progress-track { border: 2px solid #000; border-radius: 9999px; background: #fff; overflow: hidden; height: 1rem; }
    .neo-scrollbar::-webkit-scrollbar { width: 12px; }
    .neo-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-left: 2px solid #000; }
    .neo-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 99px; border: 3px solid #fff; }
  `;
  document.head.appendChild(style);
}

export default function HomePage() {
  const [progress, setProgress] = useState<ProgressData>({
    completedLessons: [], stars: 0, streak: 1, level: 1, exp: 0, dailyGoal: 100, dailyProgress: 0
  })
  const MAX_STARS = 100;
  const XP_PER_LEVEL = 100; 
  const DAILY_XP_GOAL = 300;
  const [showStudentIdDialog, setShowStudentIdDialog] = useState(false);
  const [showLeaderboardDialog, setShowLeaderboardDialog] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [hasStudentId, setHasStudentId] = useState(false);
  const [completionTime, setCompletionTime] = useState<string | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboardStats, setLeaderboardStats] = useState<{
    total_participants: number;
    fastest_time: string;
    average_time: string;
    rankings: { student_id: string, student_name: string, completion_time_string: string, rank: number }[];
  }>({
    total_participants: 0, fastest_time: '--:--', average_time: '--:--', rankings: []
  });
  
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  
  // ✅ 修改 1：修改 useEffect 抓取邏輯，對接真實排行榜與個人排名
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // 1. 抓取課程列表
        const fetchedLessons = await getLessons();
        setLessons(fetchedLessons);
        
        // 2. 抓取本地進度
        const savedProgress = getProgress();
        setProgress(prev => ({ ...prev, ...savedProgress }));
        
        // 3. 身份確認
        const savedStudentId = localStorage.getItem('student_id');
        setHasStudentId(!!savedStudentId);

        // 🚀 4. 抓取資料庫真實排行榜 (前 20 名)
        const boardData = await getRealLeaderboard();
        
        // 🚀 5. 抓取目前登入學生的真實排名與「累積修行總時長」
        if (savedStudentId) {
          const myData = await getMyRealRank(savedStudentId);
          if (myData) {
            setPlayerRank(myData.rank);
            setCompletionTime(myData.time_string); // 顯示 HH:mm:ss
          }
        }

        // 6. 更新排行榜彈窗資料
        setLeaderboardStats({
          total_participants: boardData.length,
          fastest_time: boardData[0]?.time_string || '--:--',
          average_time: '實時更新中',
          rankings: boardData.map((item: any) => ({
            student_id: item.student_id,
            student_name: item.student_name,
            completion_time_string: item.time_string,
            rank: item.rank
          }))
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching real-time data:', error);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const isCompleted = lessons.length > 0 && progress.completedLessons.length >= lessons.length;

  const handleReset = () => {
    localStorage.clear();
    resetProgress();
    window.location.reload();
  };

  const handleStartLearning = () => {
    if (hasStudentId) {
      const currentLessonId = lessons.find(l => !progress.completedLessons.includes(l.id))?.id || lessons[0]?.id;
      if (currentLessonId) router.push(`/lessons/${currentLessonId}`);
    } else {
      setShowStudentIdDialog(true);
    }
  };

  // ✅ 修改 2：修正註冊後的重整邏輯，確保畫面與資料庫同步
  const handleStudentIdSubmit = async () => {
    if (studentId.trim() && studentName.trim()) {
      try {
        await registerStudent(studentId.trim(), studentName.trim());
        localStorage.setItem('student_id', studentId.trim());
        localStorage.setItem('student_name', studentName.trim());
        setHasStudentId(true);
        setShowStudentIdDialog(false);
        // 🚀 強制重整以抓取資料庫中的新排名
        window.location.reload(); 
      } catch (error) {
        console.error('Registration error:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center neo-bg-pattern">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl font-bold font-mono uppercase tracking-widest">LOADING...</p>
        </div>
      </div>
    );
  }

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

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-yellow-300 border-2 border-black px-3 py-1 rounded-full shadow-[2px_2px_0px_0px_#000]">
              <Trophy className="h-4 w-4" />
              <span className="font-bold text-sm uppercase">Rank {isCompleted ? (playerRank || '??') : ''}</span>
            </div>

            <div className="flex items-center gap-3">
              
              <div className="flex items-center gap-1 bg-white border-2 border-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#000]">
                {/* 🚀 將 Flame 改為 Clock，並建議移除 fill (時鐘通常不填色) 並改為深灰色 */}
                <Clock className="h-4 w-4 text-slate-600" /> 
                <span className="font-bold">{completionTime || '00:00:00'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tight">
              Excel <span className="text-purple-600 bg-purple-100 px-2 border-2 border-black -rotate-2 inline-block shadow-[4px_4px_0px_0px_#000]">wizard</span>
            </h1>
            <p className="text-lg md:text-xl font-bold text-gray-600 max-w-2xl mx-auto">踏入 Excel 魔法學院，成為數據分析法師！</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="neo-container neo-container-interactive bg-white p-6 border-l-[8px] border-l-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 p-2 rounded-lg border-2 border-black"><Trophy className="h-6 w-6 text-blue-600" /></div>
                <span className="font-black text-sm uppercase bg-black text-white px-2 py-1 rounded">Level {progress.level}</span>
              </div>
              {/* 🚀 把 100 全部換成 XP_PER_LEVEL */}
              <div className="text-3xl font-black mb-1">{progress.exp % XP_PER_LEVEL}/{XP_PER_LEVEL} <span className="text-sm text-gray-500">XP</span></div>
              <div className="neo-progress-track bg-gray-100 h-3">
                <div 
                  className="bg-blue-500 h-full border-r-2 border-black" 
                  style={{ width: `${((progress.exp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }} 
                ></div>
              </div>

              {/* 🚀 在這裡加上這行文字 */}
              <p className="text-mi font-bold text-gray-500 mt-2 text-right">法術熟練等級</p>
            </div>

            
            <div className="neo-container neo-container-interactive bg-white p-6 border-l-[8px] border-l-yellow-400">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-yellow-100 p-2 rounded-lg border-2 border-black"><Star className="h-6 w-6 text-yellow-600" /></div>
                <span className="font-black text-sm uppercase bg-black text-white px-2 py-1 rounded">Badge</span>
              </div>
              {/* Stars Card */}
              <div className="text-3xl font-black mb-1">
                {progress.stars}/{MAX_STARS} <span className="text-sm text-gray-500">Stars</span>
              </div>
              <div className="neo-progress-track bg-gray-100 h-3">
                <div 
                  className="bg-yellow-400 h-full border-r-2 border-black" 
                  style={{ width: `${(progress.stars / MAX_STARS) * 100}%` }} // 🚀 改用變數計算比例
                ></div>
              </div>
              <p className="text-mi font-bold text-gray-500 mt-2 text-right">星辰徽章數量</p>
            </div>

            <div className="neo-container neo-container-interactive bg-white p-6 border-l-[8px] border-l-red-500">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-red-100 p-2 rounded-lg border-2 border-black"><Flame className="h-6 w-6 text-red-600" /></div>
                <span className="font-black text-sm uppercase bg-black text-white px-2 py-1 rounded">Daily</span>
              </div>
              {/* 改用 DAILY_XP_GOAL */}
              <div className="text-3xl font-black mb-1">{progress.dailyProgress}/{DAILY_XP_GOAL} <span className="text-sm text-gray-500">XP</span></div>
              <div className="neo-progress-track bg-gray-100 h-3">
                <div 
                  className="bg-red-500 h-full border-r-2 border-black" 
                  style={{ width: `${Math.min((progress.dailyProgress / DAILY_XP_GOAL) * 100, 100)}%` }} 
                ></div>
              </div>

              {/* 🚀 在這裡加上這行文字 */}
              <p className="text-mi font-bold text-gray-500 mt-2 text-right">今日修行目標</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8">
            <div className="neo-container bg-white p-6 md:p-8 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><BookOpen className="h-64 w-64 text-black" /></div>
              <h2 className="text-2xl font-black mb-8 border-b-4 border-black pb-2 inline-block uppercase">🗺️ 魔法修行地圖</h2>
              <div className="space-y-6 relative pl-4 md:pl-8">
                <div className="absolute left-[27px] md:left-[43px] top-4 bottom-10 w-1 bg-gray-200 -z-10 border-r border-gray-300"></div>
                {lessons.map((lesson, index) => {
                  const isDone = progress.completedLessons.includes(lesson.id);
                  const canEnter = hasStudentId && (index === 0 || progress.completedLessons.includes(lessons[index-1].id));
                  const isLocked = !canEnter;
                  const isCurrent = canEnter && !isDone;
                  return (
                    <div key={lesson.id} className="relative group">
                      <Link href={isLocked ? "#" : `/lessons/${lesson.id}`} onClick={(e) => isLocked && e.preventDefault()} className={`block ${!isLocked ? '' : 'cursor-not-allowed'}`}>
                        <div className={`neo-lesson-node flex items-center gap-4 p-4 border-3 border-black rounded-xl transition-all ${isDone ? 'bg-green-100' : isCurrent ? 'bg-blue-100 scale-[1.02] shadow-[6px_6px_0px_0px_#000]' : 'bg-gray-100 opacity-60'}`}>
                          <div className={`w-14 h-14 rounded-full flex items-center justify-center border-3 border-black font-black text-xl z-10 shrink-0 ${isDone ? 'bg-green-400 text-black' : isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'}`}>
                            {isDone ? <Star className="h-7 w-7 fill-black" /> : isLocked ? <Lock className="h-6 w-6" /> : index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-black text-lg truncate ${isLocked ? 'text-gray-500' : 'text-black'}`}>{lesson.title}</h3>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chapter {index + 1}</p>
                          </div>
                          <div className="hidden sm:block shrink-0">
                            {isLocked ? (
                              <span className="bg-gray-300 text-gray-600 text-xs font-black px-2 py-1 rounded border-2 border-gray-500 uppercase">Locked</span>
                            ) : isDone ? (
                              <span className="bg-green-400 text-black text-xs font-black px-2 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000]">Done!</span>
                            ) : (
                              <div className="bg-blue-500 text-white text-xs font-black px-3 py-1.5 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1 group-hover:bg-blue-600">PLAY <ChevronRight className="h-4 w-4" /></div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6">
              <div className="neo-container bg-purple-600 p-6 text-black relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-black text-xl mb-2">✨準備好踏入學院了嗎？✨</h3>
                  <p className="text-sm font-bold mb-6 opacity-90">啟動你的 Excel 魔法修行之旅，逐步掌握數據分析之力！</p>
                  {isCompleted ? (
                    <Button onClick={handleReset} className="w-full neo-btn bg-white text-black h-12"><RotateCcw className="mr-2 h-4 w-4" /> 重新挑戰</Button>
                  ) : (
                    <Button onClick={handleStartLearning} className="w-full neo-btn bg-yellow-400 text-black h-12 shadow-[4px_4px_0px_0px_#000]">{hasStudentId ? '繼續學習' : '開始學習'}</Button>
                  )}
                </div>
              </div>

              <div className="neo-container bg-white p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-500" /> 排行榜</h3>
                {/* 🚀 修改：只有完成後才顯示「查看全部」按鈕 */}
                {isCompleted && (
                  <button onClick={() => setShowLeaderboardDialog(true)} className="text-xs font-bold underline hover:text-purple-600">查看全部</button>
                )}
              </div>

              {/* 🚀 修改：多層判斷邏輯 */}
              {hasStudentId && isCompleted ? (
                // 情況 A：已登錄且全部完成 -> 顯示真實名次
                <div className="bg-blue-50 border-2 border-black p-4 rounded-lg shadow-[2px_2px_0px_0px_#000] cursor-pointer hover:translate-y-[-2px] transition-transform" onClick={() => setShowLeaderboardDialog(true)}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase">Your Rank</div>
                      <div className="text-2xl font-black text-blue-600">#{playerRank || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-gray-500 uppercase">Total Time</div>
                      <div className="text-lg font-bold">{completionTime || '--:--'}</div>
                    </div>
                  </div>
                </div>
              ) : hasStudentId ? (
                // 情況 B：已登錄但尚未完成最後一關 -> 顯示鎖定狀態
                <div className="text-center py-6 bg-slate-50 border-2 border-dashed border-gray-300 rounded-lg">
                  <Lock className="h-5 w-5 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-bold text-gray-400">完成所有單元修行後<br/>解鎖修行排名</p>
                </div>
              ) : (
                // 情況 C：尚未登錄
                <div className="text-center py-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-sm font-bold text-gray-400">
                  完成登錄解鎖排名
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={showStudentIdDialog} onOpenChange={setShowStudentIdDialog}>
        <DialogContent className="neo-container border-4 border-black p-0 overflow-hidden sm:max-w-[400px]">
          <div className="bg-yellow-300 p-4 border-b-4 border-black"><DialogTitle className="text-xl font-black uppercase tracking-tight">🎓 魔法學院新生報到</DialogTitle><DialogDescription className="text-black font-bold opacity-70">輸入資料以開始學習</DialogDescription></div>
          <div className="p-6 space-y-4 bg-white">
            <div className="space-y-2"><label className="font-black text-sm uppercase">學號</label><input type="text" className="neo-input" placeholder="請輸入學號" value={studentId} onChange={(e) => setStudentId(e.target.value)} /></div>
            <div className="space-y-2"><label className="font-black text-sm uppercase">姓名</label><input type="text" className="neo-input" placeholder="請輸入姓名" value={studentName} onChange={(e) => setStudentName(e.target.value)} /></div>
            <div className="pt-4"><Button onClick={handleStudentIdSubmit} disabled={!studentId.trim() || !studentName.trim()} className="w-full neo-btn bg-black text-white h-12">開始學習</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderboardDialog} onOpenChange={setShowLeaderboardDialog}>
        <DialogContent className="neo-container border-4 border-black p-0 overflow-hidden sm:max-w-[600px] w-[95vw] max-h-[90vh]">
          <div className="bg-blue-500 p-4 border-b-4 border-black text-white"><DialogTitle className="text-xl font-black uppercase flex items-center gap-2"><Trophy className="h-6 w-6 text-yellow-300 fill-yellow-300" /> 修行榮譽榜</DialogTitle></div>
          <div className="p-4 sm:p-6 bg-white overflow-y-auto max-h-[calc(90vh-100px)] neo-scrollbar">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
              <div className="bg-blue-50 border-2 border-black p-2 rounded text-center"><div className="text-xl font-black">{leaderboardStats.total_participants}</div><div className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">總人數</div></div>
              <div className="bg-yellow-50 border-2 border-black p-2 rounded text-center"><div className="text-xl font-black">{leaderboardStats.fastest_time}</div><div className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">最高紀錄</div></div>
              <div className="bg-green-50 border-2 border-black p-2 rounded text-center"><div className="text-xl font-black">{leaderboardStats.average_time}</div><div className="text-[10px] sm:text-xs font-bold uppercase text-gray-500">狀態</div></div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-black text-gray-400 uppercase"><div className="col-span-2">Rank</div><div className="col-span-3">ID</div><div className="col-span-4">Name</div><div className="col-span-3 text-right">Time</div></div>
              {leaderboardStats.rankings.length === 0 ? (<div className="text-center py-8 text-gray-400 font-bold border-2 border-dashed border-gray-200 rounded">尚無紀錄，成為第一名吧！</div>) : (
                leaderboardStats.rankings.map((entry, index) => (
                  <div key={index} className={`grid grid-cols-12 gap-2 items-center p-3 border-2 border-black rounded-lg ${entry.student_id === localStorage.getItem('student_id') ? 'bg-yellow-100 shadow-[2px_2px_0px_0px_#000]' : 'bg-white'}`}>
                    <div className="col-span-2 font-black text-lg">#{entry.rank}</div>
                    <div className="col-span-3 font-bold text-sm truncate">{entry.student_id}</div>
                    <div className="col-span-4 font-bold text-sm truncate">{entry.student_name}</div>
                    <div className="col-span-3 font-mono font-bold text-sm text-right">{entry.completion_time_string}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}