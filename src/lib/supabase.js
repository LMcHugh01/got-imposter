import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Using fallback characters.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Fallback characters in case Supabase is not configured
export const fallbackCharacters = {
  easy: [
    { id: '1', name: 'Jon Snow', image_url: null, difficulty: 'easy' },
    { id: '2', name: 'Daenerys Targaryen', image_url: null, difficulty: 'easy' },
    { id: '3', name: 'Tyrion Lannister', image_url: null, difficulty: 'easy' },
    { id: '4', name: 'Cersei Lannister', image_url: null, difficulty: 'easy' },
    { id: '5', name: 'Arya Stark', image_url: null, difficulty: 'easy' },
    { id: '6', name: 'Ned Stark', image_url: null, difficulty: 'easy' },
    { id: '7', name: 'Joffrey Baratheon', image_url: null, difficulty: 'easy' },
    { id: '8', name: 'Sansa Stark', image_url: null, difficulty: 'easy' },
  ],
  medium: [
    { id: '9', name: 'The Hound', image_url: null, difficulty: 'medium' },
    { id: '10', name: 'Littlefinger', image_url: null, difficulty: 'medium' },
    { id: '11', name: 'Varys', image_url: null, difficulty: 'medium' },
    { id: '12', name: 'Melisandre', image_url: null, difficulty: 'medium' },
    { id: '13', name: 'Jaime Lannister', image_url: null, difficulty: 'medium' },
    { id: '14', name: 'Brienne of Tarth', image_url: null, difficulty: 'medium' },
    { id: '15', name: 'Theon Greyjoy', image_url: null, difficulty: 'medium' },
    { id: '16', name: 'Stannis Baratheon', image_url: null, difficulty: 'medium' },
  ],
  hard: [
    { id: '17', name: 'Ygritte', image_url: null, difficulty: 'hard' },
    { id: '18', name: 'Gendry', image_url: null, difficulty: 'hard' },
    { id: '19', name: 'Beric Dondarrion', image_url: null, difficulty: 'hard' },
    { id: '20', name: 'Olenna Tyrell', image_url: null, difficulty: 'hard' },
    { id: '21', name: 'Euron Greyjoy', image_url: null, difficulty: 'hard' },
    { id: '22', name: 'Qyburn', image_url: null, difficulty: 'hard' },
    { id: '23', name: 'Podrick Payne', image_url: null, difficulty: 'hard' },
    { id: '24', name: 'Tormund Giantsbane', image_url: null, difficulty: 'hard' },
  ],
}

const difficultyMap = {
  easy: ['easy'],
  medium: ['easy', 'medium'],
  hard: ['easy', 'medium', 'hard'],
}

export async function fetchRandomCharacter(difficulty) {
  const levels = difficultyMap[difficulty]
  try {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .in('difficulty', levels)

    if (error || !data || data.length === 0) {
      throw new Error('Supabase fetch failed or empty')
    }

    const random = Math.floor(Math.random() * data.length)
    return data[random]
  } catch {
    // Fallback to local data (cumulative)
    const chars = levels.flatMap((level) => fallbackCharacters[level])
    const random = Math.floor(Math.random() * chars.length)
    return chars[random]
  }
}
