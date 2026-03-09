"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from '@/lib/supabase'
import { Edit, Save, ExternalLink, Loader2, BookOpen, Link as LinkIcon, FileText, BarChart3, Users, Clock, BrainCircuit, Star, Plus } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

// ✅ 匯入圖表元件
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

// --- 型別定義 ---
interface Lesson {
  lesson_id: string
  title: string
  description: string
  number: number
  practice_exercises: string 
  content: string
  genially_link: string
}

interface Analytics {
  student_id: string
  lesson_id: string
  time_spent_seconds: number
  accuracy_rate: number
  wrong_types: string[]
  ai_interaction_count: number
  ai_chat_history: any[]
  created_at: string
}

export default function AdminPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [analytics, setAnalytics] = useState<Analytics[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [formData, setFormData] = useState<Partial<Lesson>>({})
  const [jsonError, setJsonError] = useState<string | null>(null)

  // 取得數據
  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: lessonData } = await supabase.from('lessons').select('*').order('number', { ascending: true })
      const { data: analyticData } = await supabase.from('learning_analytics').select('*').order('created_at', { ascending: false })
      
      if (lessonData) setLessons(lessonData)
      if (analyticData) setAnalytics(analyticData)
    } catch (err) {
      console.error("Fetch error:", err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleEdit = (lesson: Lesson) => {
    setCurrentLesson(lesson)
    setFormData({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content,
      genially_link: lesson.genially_link,
      practice_exercises: typeof lesson.practice_exercises === 'object' 
        ? JSON.stringify(lesson.practice_exercises, null, 2) 
        : lesson.practice_exercises
    })
    setJsonError(null)
    setIsDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (name === 'practice_exercises') {
      try { JSON.parse(value); setJsonError(null); } catch (err) { setJsonError("JSON 格式錯誤"); }
    }
  }

  const handleSave = async () => {
    if (!currentLesson) return
    if (jsonError) { alert("請先修正 JSON 格式錯誤"); return; }
    setLoading(true)
    const { error } = await supabase.from('lessons').update({
        title: formData.title,
        description: formData.description,
        content: formData.content,
        genially_link: formData.genially_link,
        practice_exercises: formData.practice_exercises
      }).eq('lesson_id', currentLesson.lesson_id)

    if (error) alert('儲存失敗：' + error.message)
    else { setIsDialogOpen(false); fetchData(); }
    setLoading(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  }

  const getChartData = () => {
    const counts: Record<string, number> = {};
    analytics.forEach(a => {
      a.wrong_types?.forEach(type => {
        counts[type] = (counts[type] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6 md:p-10 text-slate-900">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">學院控制塔 🏰</h1>
            <p className="text-slate-500 mt-2 text-lg">管理魔法課程並觀測學徒們的修行進度</p>
          </div>
          <Button variant="outline" onClick={fetchData} className="bg-white border-slate-200">
            <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 重新整理數據
          </Button>
        </header>

        <Tabs defaultValue="management" className="space-y-8">
          <TabsList className="bg-slate-200/50 p-1 shadow-inner border rounded-xl h-14">
            <TabsTrigger value="management" className="px-8 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white h-full transition-all">
              <BookOpen className="w-4 h-4 mr-2" /> 課程管理
            </TabsTrigger>
            <TabsTrigger value="analytics" className="px-8 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white h-full transition-all">
              <BarChart3 className="w-4 h-4 mr-2" /> 學習報告分析
            </TabsTrigger>
          </TabsList>

          {/* 課程管理分頁 */}
          <TabsContent value="management">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lessons.map((lesson) => (
                  <Card key={lesson.lesson_id} className="group hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md bg-white overflow-hidden border-slate-200"> 
                    <div className="h-2 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                      <Badge className="w-fit mb-3 bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1">第 {lesson.number} 關</Badge>
                      <CardTitle className="text-xl font-bold">{lesson.title}</CardTitle>
                      <CardDescription className="line-clamp-2 h-10 text-slate-500">{lesson.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="w-4 h-4 text-blue-500" /> 
                        <span>內容：{lesson.content ? `${lesson.content.length} 字` : "未設定"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <LinkIcon className="w-4 h-4 text-blue-500" />
                        <span className="truncate">Genially：{lesson.genially_link ? "已連結" : "未設定"}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 border-t mt-2">
                      <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-100 font-bold py-6" onClick={() => handleEdit(lesson)}>
                        <Edit className="w-4 h-4 mr-2" /> 編輯課程內容
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 數據分析分頁 */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-white border-none shadow-sm p-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Users className="w-6 h-6" /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">總修行人次</p>
                      <p className="text-2xl font-bold">{analytics.length}</p>
                    </div>
                 </div>
              </Card>
              <Card className="bg-white border-none shadow-sm p-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl text-green-600"><Star className="w-6 h-6" /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">平均正確率</p>
                      <p className="text-2xl font-bold">
                        {(analytics.reduce((acc, cur) => acc + (cur.accuracy_rate || 0), 0) / (analytics.length || 1) * 100).toFixed(0)}%
                      </p>
                    </div>
                 </div>
              </Card>
              <Card className="bg-white border-none shadow-sm p-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl text-purple-600"><BrainCircuit className="w-6 h-6" /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">AI 互動總數</p>
                      <p className="text-2xl font-bold">{analytics.reduce((acc, cur) => acc + (cur.ai_interaction_count || 0), 0)}</p>
                    </div>
                 </div>
              </Card>
              <Card className="bg-white border-none shadow-sm p-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl text-orange-600"><Clock className="w-6 h-6" /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">平均時長</p>
                      <p className="text-2xl font-bold">{formatTime(Math.floor(analytics.reduce((acc, cur) => acc + (cur.time_spent_seconds || 0), 0) / (analytics.length || 1)))}</p>
                    </div>
                 </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="lg:col-span-2 bg-white shadow-sm border-none overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg font-bold">全體學徒：知識點錯誤分佈</CardTitle>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 13}} />
                        <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={24}>
                          {getChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#a855f7', '#d946ef'][index % 4]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm border-none overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b">
                  <CardTitle className="text-lg font-bold">即時學習軌跡</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                    {analytics.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 italic">尚未有學習紀錄存入</div>
                    ) : analytics.map((log, i) => (
                      <div key={i} className="p-5 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800">學員：{log.student_id}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] bg-slate-100 font-mono border-none">{log.lesson_id.slice(0,8)}</Badge>
                            <span className="text-[11px] text-slate-400 font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-black ${log.accuracy_rate >= 0.7 ? 'text-emerald-500' : 'text-orange-500'}`}>{(log.accuracy_rate * 100).toFixed(0)}%</p>
                          <p className="text-[11px] text-slate-400 font-bold">AI 互動: {log.ai_interaction_count || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white rounded-t-lg">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Edit className="w-6 h-6" /> 編輯內容：{currentLesson?.title}</DialogTitle>
            <DialogDescription className="text-slate-400">修改將即時反映於地圖中。</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 border border-slate-200 rounded-2xl bg-slate-50/50">
                <div className="space-y-5">
                   <div className="grid gap-2">
                      <Label className="font-bold text-slate-700">關卡名稱</Label>
                      <Input name="title" value={formData.title || ''} onChange={handleInputChange} className="bg-white border-slate-300" />
                   </div>
                   <div className="grid gap-2">
                      <Label className="font-bold text-slate-700">Genially 互動連結</Label>
                      <Input name="genially_link" placeholder="請貼上 iframe src 網址" value={formData.genially_link || ''} onChange={handleInputChange} className="bg-white border-slate-300" />
                   </div>
                </div>
                <div className="grid gap-2">
                   <Label className="font-bold text-slate-700">關卡簡介</Label>
                   <Textarea name="description" value={formData.description || ''} onChange={handleInputChange} rows={5} className="bg-white border-slate-300 resize-none" />
                </div>
            </div>

            <div className="grid gap-3">
              <Label className="font-bold flex items-center gap-2 text-slate-700"><FileText className="w-5 h-5 text-blue-500" /> 📖 Markdown 課程內容</Label>
              <Textarea name="content" value={formData.content || ''} onChange={handleInputChange} rows={12} className="font-mono text-sm p-4 bg-white border-slate-300" placeholder="# 開始編寫教材..." />
            </div>

            <div className="grid gap-3">
              <div className="flex justify-between items-center">
                <Label className="font-bold flex items-center gap-2 text-slate-700"><Plus className="w-5 h-5 text-purple-500" /> ✍️ 關卡挑戰題 (JSON)</Label>
                <a href="https://jsoneditoronline.org/" target="_blank" className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">JSON 格式檢查 <ExternalLink className="w-3 h-3 ml-1"/></a>
              </div>
              <Textarea
                name="practice_exercises"
                value={formData.practice_exercises || ''}
                onChange={handleInputChange}
                className={`font-mono text-xs bg-slate-900 text-emerald-400 p-4 rounded-xl ${jsonError ? 'border-red-500 ring-2 ring-red-500' : 'border-none'}`}
                rows={10}
              />
              {/* ✅ 修正後的 jsonError 顯示邏輯 */}
              {!!jsonError && <p className="text-sm text-red-500 font-black animate-pulse">⚠️ {jsonError}</p>}
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-bold text-slate-500">取消</Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 px-10 py-6 text-lg font-bold" disabled={!!jsonError || loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
              儲存更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}