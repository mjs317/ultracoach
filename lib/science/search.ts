export type SearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
};

const TAVILY_URL = "https://api.tavily.com/search";
const EXA_URL = "https://api.exa.ai/search";

export async function searchWeb(query: string, max = 6): Promise<SearchResult[]> {
  const provider = (process.env.SEARCH_PROVIDER || "tavily").toLowerCase();
  if (provider === "exa" && process.env.EXA_API_KEY) {
    return exaSearch(query, max);
  }
  if (process.env.TAVILY_API_KEY) {
    return tavilySearch(query, max);
  }
  return [];
}

async function tavilySearch(query: string, max: number): Promise<SearchResult[]> {
  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: max,
        search_depth: "advanced",
        include_answer: false,
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: {
      results?: { title: string; url: string; content: string; score?: number }[];
    } = await res.json();
    return (
      data.results?.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })) ?? []
    );
  } catch {
    return [];
  }
}

async function exaSearch(query: string, max: number): Promise<SearchResult[]> {
  try {
    const res = await fetch(EXA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.EXA_API_KEY!,
      },
      body: JSON.stringify({
        query,
        numResults: max,
        contents: { text: { maxCharacters: 1200 } },
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: {
      results?: {
        title?: string;
        url: string;
        text?: string;
        score?: number;
      }[];
    } = await res.json();
    return (
      data.results?.map((r) => ({
        title: r.title || r.url,
        url: r.url,
        content: r.text ?? "",
        score: r.score,
      })) ?? []
    );
  } catch {
    return [];
  }
}
