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
  "type": "verb",
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
  "type": "${partOfSpeech}"${partOfSpeech === "noun" ? ',\n  "article": "el/la/los/las"' : ""}
}`;

  const result = await callOpenAI(
    [{ role: "user", content: prompt }],
    apiKey,
    isVerb ? 800 : 200,
  );
  
  // Normalize partOfSpeech to type if needed
  if (result.partOfSpeech && !result.type) {
    result.type = result.partOfSpeech;
    delete result.partOfSpeech;
  }
  
  return result;
};

export const generateExamples = async (wordData, apiKey) => {
  const isVerb = wordData.type === "verb";

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
      "form_pl": "jem",
      "example": "Yo como una manzana todos los días.",
      "example_pl": "Jem jabłko codziennie."
    },
    {
      "tense": "present",
      "person": 2,
      "form": "comes",
      "form_pl": "jesz",
      "example": "Tú comes pizza con amigos.",
      "example_pl": "Jesz pizzę z przyjaciółmi."
    }
  ]
}

Zasady:
- "form_pl" → zawsze krótka forma w **polskim** (w odpowiedniej osobie, bez "ja/ty" na początku, np. "jem", "jesz", "je", "jemy", "jecie", "jedzą")
- "example" → naturalne zdanie po **hiszpańsku** z użyciem dokładnie tej formy czasownika
- "example_pl" → dokładne, naturalne tłumaczenie tego zdania na **polski**
- Wygeneruj wszystkie 18 form (present 1-6, past/pretérito indefinido 1-6, future/futuro simple 1-6)
- person: 1 = ja, 2 = ty, 3 = on/ona/Pan/Pani, 4 = my, 5 = wy, 6 = oni/one/Państwo
- Używaj realistycznych, codziennych zdań
- Nie dodawaj wyjaśnień, nie używaj markdownu, tylko czysty JSON`;
  } else {
    prompt = `Dla hiszpańskiego ${wordData.type} "${wordData.article ? wordData.article + " " : ""}${wordData.translation}" (polski: ${wordData.word}), wygeneruj jedno dobre, naturalne przykładowe zdanie. Zwróć JSON:
{
  "example": "Zdanie po hiszpańsku z użyciem słowa",
  "example_pl": "Naturalne tłumaczenie na polski"
}`;
  }

  const result = await callOpenAI(
    [{ role: "user", content: prompt }],
    apiKey,
    isVerb ? 1500 : 300,
  );
  
  // Normalize translation_form to form_pl if needed
  if (result.forms_examples) {
    result.forms_examples = result.forms_examples.map(fe => {
      if (fe.translation_form && !fe.form_pl) {
        const { translation_form, ...rest } = fe;
        return { ...rest, form_pl: translation_form };
      }
      return fe;
    });
  }
  
  return result;
};
