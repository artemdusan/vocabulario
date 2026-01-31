const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o";

const callOpenAI = async (messages, apiKey, maxTokens = 500) => {
  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || "Błąd API OpenAI");
  }

  const data = await response.json();
  const text = data.choices[0].message.content
    .replace(/```json|```/g, "")
    .trim();
  return JSON.parse(text);
};

export const generateWordData = async (polishWord, partOfSpeech, apiKey) => {
  const isVerb = partOfSpeech === "verb";

  const prompt = isVerb
    ? `Translate Polish verb "${polishWord}" to Spanish. Return JSON:
{
  "word": "Polish word",
  "translation": "Spanish infinitive",
  "partOfSpeech": "verb",
  "forms": {
    "present": ["yo form", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"],
    "past": ["yo form (pretérito indefinido)", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"],
    "future": ["yo form", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"]
  }
}`
    : `Translate Polish ${partOfSpeech} "${polishWord}" to Spanish. Return JSON:
{
  "word": "Polish word",
  "translation": "Spanish word",
  "partOfSpeech": "${partOfSpeech}"${partOfSpeech === "noun" ? ',\n  "article": "el/la/los/las"' : ""}
}`;

  return callOpenAI(
    [{ role: "user", content: prompt }],
    apiKey,
    isVerb ? 800 : 200,
  );
};

export const generateExamples = async (wordData, apiKey) => {
  const isVerb = wordData.partOfSpeech === "verb";

  const prompt = isVerb
    ? `For Spanish verb "${wordData.translation}" (Polish: ${wordData.word}), generate example sentences for EACH conjugation form. Return JSON:
{
  "forms_examples": [
    {"tense": "present", "person": 1, "translation_form": "Polish translation of this form", "example": "Spanish sentence using yo form", "example_pl": "Polish translation"},
    {"tense": "present", "person": 2, "translation_form": "...", "example": "...", "example_pl": "..."},
    ... (all 18 forms: present 1-6, past 1-6, future 1-6)
  ]
}`
    : `For Spanish ${wordData.partOfSpeech} "${wordData.article ? wordData.article + " " : ""}${wordData.translation}" (Polish: ${wordData.word}), generate one example sentence. Return JSON:
{
  "example": "Spanish sentence using the word",
  "example_pl": "Polish translation"
}`;

  return callOpenAI(
    [{ role: "user", content: prompt }],
    apiKey,
    isVerb ? 2000 : 200,
  );
};
