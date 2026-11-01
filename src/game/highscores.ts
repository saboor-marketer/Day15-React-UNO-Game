export interface HighScore {
  name: string;
  score: number;
  round: number;
  date: number;
}

const KEY = "uno-arcade:highscores";
const NAME_KEY = "uno-arcade:name";
export const MAX_SCORES = 10;

export function loadHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((h) => typeof h.score === "number").slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

export function saveHighScore(entry: HighScore): { list: HighScore[]; rank: number } {
  const list = [...loadHighScores(), entry].sort((a, b) => b.score - a.score || a.date - b.date).slice(0, MAX_SCORES);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  const rank = list.findIndex((h) => h.date === entry.date && h.score === entry.score);
  return { list, rank };
}

export function qualifies(score: number): boolean {
  if (score <= 0) return false;
  const list = loadHighScores();
  if (list.length < MAX_SCORES) return true;
  return score > list[list.length - 1].score;
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "ACE";
  } catch {
    return "ACE";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* ignore */
  }
}
