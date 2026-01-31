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

  let prompt;

  if (isVerb) {
    prompt = `Jesteś nauczycielem języka hiszpańskiego i polskiego.

Dla hiszpańskiego czasownika **${wordData.translation}** (polski: **${wordData.word}**),

Wygeneruj dokładnie 18 przykładowych zdań — po jednym dla każdej formy odmiany.

Zwróć **tylko** poprawny JSON w tej dokładnej strukturze — nic więcej przed ani po:

{
  "forms_examples": [
    {
      "tense": "present",
      "person": 1,
      "form": "como",
      "translation_form": "jem",
      "example": "Yo como una manzana todos los días.",
      "example_pl": " Jem jabłko codziennie."
    },
    {
      "tense": "present",
      "person": 2,
      "form": "comes",
      "translation_form": "jesz",
      "example": "Tú comes pizza con amigos.",
      "example_pl": " Jesz pizzę z przyjaciółmi."
    },
    // ... i tak dalej dla wszystkich 18 form (present 1–6, pretérito indefinido 1–6, futuro simple 1–6)
    // person: 1 = ja, 2 = ty, 3 = on/ona/Pan/Pani, 4 = my, 5 = wy, 6 = oni/one/Państwo
  ]
}

Zasady:
- "translation_form" → zawsze krótka forma w **polskim** (w 1. os. lp., bez "ja/ty" na początku, np. "jem", "jesz", "je", "jemy", "jecie", "jedzą")
- "example" → naturalne zdanie po **hiszpańsku** z użyciem dokładnie tej formy czasownika
- "example_pl" → dokładne, naturalne tłumaczenie tego zdania na **polski**
- Używaj realistycznych, codziennych zdań
- Nie dodawaj wyjaśnień, nie używaj markdownu, tylko czysty JSON`;
  } else {
    // prompt dla rzeczowników/przymiotników — też po polsku
    prompt = `Dla hiszpańskiego ${wordData.partOfSpeech} "${wordData.article ? wordData.article + " " : ""}${wordData.translation}" (polski: ${wordData.word}), wygeneruj jedno dobre, naturalne przykładowe zdanie. Zwróć JSON:
{
  "example": "Zdanie po hiszpańsku z użyciem słowa",
  "example_pl": "Naturalne tłumaczenie na polski"
}`;
  }

  return callOpenAI(
    [{ role: "user", content: prompt }],
    apiKey,
    isVerb ? 1200 : 300,
  );
};
