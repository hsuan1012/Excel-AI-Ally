import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- 介面定義 ---

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  level: string;
  markdown_content?: string;
  genially_link?: string;
  created_at: string;
  topics?: string[];
}

export interface LearningRecord {
  id?: string | number
  student_id: string
  student_name: string
  lesson_id: string
  started_at: string
  completed_at: string
  time_spent_seconds: number
  answer_attempts: number
}

export interface LeaderboardEntry {
  id?: string | number
  student_id: string
  student_name: string
  completion_time_seconds: number
  completion_time_string: string
  completed_at: string
  started_at: string
  stars_earned: number
  rank?: number
}

export interface LeaderboardStats {
  total_participants: number;
  fastest_time: string;
  average_time: string;
  rankings: { student_id: string, student_name: string, completion_time_string: string, rank: number }[];
}

export interface LessonOrderMapping {
  id: string;
  created_at: string;
  user_id: string;
  game_id: string;
  mapping: {
    number: number;
    lesson_id: string;
    genially_link?: string;
  }[];
}

export interface ChatMessageRecord {
  id?: string;
  learning_record_id: string
  student_id: string
  lesson_id: string
  message_content: string
  is_user: boolean
  timestamp: string
}

export interface QuestionCountRecord {
  id?: string
  learning_record_id: string
  student_id: string
  lesson_id: string
  question_count: number
}

// ✅ 新增：學習分析報告介面
export interface LearningAnalytics {
  id?: number;
  student_id: string;
  lesson_id: string;
  time_spent_seconds: number;
  accuracy_rate: number;
  wrong_types: string[];      // 儲存為 JSONB 陣列
  ai_interaction_count: number;
  ai_chat_history: any[];     // 儲存完整對話紀錄
  created_at?: string;
}

// --- 課程相關函式 ---

export async function getLessons(): Promise<Lesson[]> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error.message);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getLessons:', error);
    return [];
  }
}

export async function getLessonById(id: string): Promise<Lesson | null> {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching lesson by id ${id}:`, error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getLessonById:', error);
    return null;
  }
}

// --- 學習紀錄儲存函式 ---

export async function saveLearningRecord(record: Omit<LearningRecord, 'id'>) {
  try {
    if (!record.student_id || !record.student_name || !record.lesson_id ||
        !record.started_at || !record.completed_at) {
      throw new Error('Missing required fields for learning record');
    }

    const { data, error } = await supabase
      .from('learning_records')
      .insert([record])
      .select();

    if (error) {
      console.error('Error saving learning record:', error.message || JSON.stringify(error));
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveLearningRecord:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}

// ✅ 新增：儲存詳細的學習分析數據
export async function saveLearningAnalytics(data: LearningAnalytics) {
  try {
    if (!data.student_id || !data.lesson_id) {
      throw new Error('Missing required fields for learning analytics');
    }

    const { data: result, error } = await supabase
      .from('learning_analytics')
      .insert([
        {
          student_id: data.student_id,
          lesson_id: data.lesson_id,
          time_spent_seconds: data.time_spent_seconds,
          accuracy_rate: data.accuracy_rate,
          wrong_types: data.wrong_types,
          ai_interaction_count: data.ai_interaction_count,
          ai_chat_history: data.ai_chat_history,
        }
      ])
      .select();

    if (error) {
      console.error('Error saving learning analytics:', error.message);
      throw error;
    }

    return result;
  } catch (error) {
    console.error('Error in saveLearningAnalytics:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}

// --- 排行榜相關函式 ---

export async function saveLeaderboardEntry(entry: Omit<LeaderboardEntry, 'id' | 'rank' | 'started_at'>) {
  try {
    if (!entry.student_id || !entry.student_name || !entry.completion_time_seconds ||
        !entry.completion_time_string || !entry.completed_at) {
      throw new Error('Missing required fields for leaderboard entry');
    }

    const startTime = localStorage.getItem('start_time');

    const { data, error } = await supabase
      .from('leaderboard')
      .insert([{
        ...entry,
        started_at: startTime || new Date().toISOString(),
      }])
      .select();

    if (error) {
      console.error('Error saving leaderboard entry:', error.message || JSON.stringify(error));
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveLeaderboardEntry:', error instanceof Error ? error.message : JSON.stringify(error));
    throw error;
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('completion_time_seconds', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Error fetching leaderboard:', error)
    return []
  }

  return data || []
}

export async function getPlayerRank(student_id: string): Promise<number> {
  const { data: allScores, error: scoresError } = await supabase
    .from('leaderboard')
    .select('student_id, completion_time_seconds')
    .order('completion_time_seconds', { ascending: true });

  if (scoresError) return 0;
  if (!allScores || allScores.length === 0) return 0;

  const bestScores = Array.from(
    (allScores as any[]).reduce((map: Map<string, any>, score: any) => {
      if (!map.has(score.student_id) || map.get(score.student_id).completion_time_seconds > score.completion_time_seconds) {
        map.set(score.student_id, score);
      }
      return map;
    }, new Map())
  ).map(([, score]: any) => score);

  bestScores.sort((a: any, b: any) => a.completion_time_seconds - b.completion_time_seconds);
  const rank = bestScores.findIndex((score: any) => score.student_id === student_id) + 1;
  return rank || bestScores.length + 1;
}

export async function getLeaderboardStats(): Promise<LeaderboardStats> {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('student_id, student_name, completion_time_seconds, completion_time_string')
    .order('completion_time_seconds', { ascending: true });

  if (error || !data || data.length === 0) {
    return { total_participants: 0, fastest_time: '--:--', average_time: '--:--', rankings: [] };
  }

  const uniqueUsers = new Set((data as any[]).map(r => r.student_id));
  const totalParticipants = uniqueUsers.size;

  const bestScores = Array.from(uniqueUsers).map(userId => {
    return (data as any[])
      .filter(r => r.student_id === userId)
      .reduce((best, curr) => best.completion_time_seconds < curr.completion_time_seconds ? best : curr);
  }).sort((a, b) => a.completion_time_seconds - b.completion_time_seconds);

  const averageSeconds = Math.floor(bestScores.reduce((sum, r) => sum + r.completion_time_seconds, 0) / totalParticipants);
  const averageTime = `${Math.floor(averageSeconds / 60)}分${averageSeconds % 60}秒`;

  const rankings = bestScores.map((record, index) => ({
    student_id: record.student_id.slice(0, 2) + '****' + record.student_id.slice(-2),
    student_name: record.student_name[0] + '○' + (record.student_name[2] || ''),
    completion_time_string: record.completion_time_string,
    rank: index + 1
  }));

  return {
    total_participants: totalParticipants,
    fastest_time: bestScores[0].completion_time_string,
    average_time: averageTime,
    rankings
  };
}

export async function getLessonOrderMappings(): Promise<LessonOrderMapping[]> {
  try {
    const { data, error } = await supabase
      .from('lesson_order_mappings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) return [];
    if (data && data.length > 0) {
      return data.map(item => ({
        ...item,
        mapping: typeof item.mapping === 'string' ? JSON.parse(item.mapping) : item.mapping
      }));
    }
    return data || [];
  } catch (error) {
    return [];
  }
}

// --- 聊天與其他輔助函式 ---

export async function saveChatMessage(message: Omit<ChatMessageRecord, 'id'>) {
  try {
    const { data, error } = await supabase.from('chat_messages').insert([message]).select();
    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
}

export async function getGeniallyLink(lessonId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('lessons').select('genially_link').eq('id', lessonId).single();
    if (error) return null;
    return data?.genially_link || null;
  } catch (error) {
    return null;
  }
}

export async function getLessonMarkdownContent(lessonId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('lessons').select('markdown_content, teaching_content').eq('id', lessonId).single();
    if (error) return null;
    return data?.markdown_content || data?.teaching_content || null;
  } catch (error) {
    return null;
  }
}

export async function registerStudent(studentId: string, name: string) {
  try {
    const { data, error } = await supabase
      .from('students')
      .upsert([{ student_id: studentId, name: name, last_active_at: new Date().toISOString() }], { onConflict: 'student_id' })
      .select();
    if (error) console.error('Error registering student:', error);
    return data;
  } catch (error) {
    return null;
  }
}

// --- 🚀 真實排行榜讀取函式 ---

// 找到 getRealLeaderboard 函式
export async function getRealLeaderboard() {
  const { data, error } = await supabase
    .from('student_leaderboard')
    .select('*')
    // 🚀 修正這裡：ascending 必須為 true，這樣第 1 名才會在陣列的第一個
    .order('rank', { ascending: true }) 
    .limit(20);
  if (error) return [];
  return data;
}

export async function getMyRealRank(student_id: string) {
  const { data, error } = await supabase
    .from('student_leaderboard')
    .select('*')
    .eq('student_id', student_id)
    .single();
  if (error) return null;
  return data;
}