# 📚 Vocabulario

Aplikacja do nauki słówek hiszpańskich z wykorzystaniem AI (OpenAI API).

## 🚀 Szybki start

```bash
# 1. Zainstaluj zależności
npm install

# 2. Uruchom aplikację
npm start
```

Aplikacja będzie dostępna pod adresem: **http://localhost:3000**

## 📁 Struktura projektu

```
vocabulario/
├── public/
│   └── index.html              # Główny plik HTML
├── src/
│   ├── components/
│   │   ├── ui/                 # Komponenty UI (przyciski, inputy, modalne)
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Select.js
│   │   │   ├── Modal.js
│   │   │   ├── Card.js
│   │   │   ├── Badge.js
│   │   │   ├── Toast.js
│   │   │   └── index.js
│   │   ├── modals/             # Komponenty modalne
│   │   │   ├── AddWordModal.js
│   │   │   ├── SettingsModal.js
│   │   │   ├── ImportCSVModal.js
│   │   │   ├── ViewWordModal.js
│   │   │   ├── EditWordModal.js
│   │   │   ├── DeleteConfirmModal.js
│   │   │   └── index.js
│   │   ├── views/              # Główne widoki
│   │   │   ├── DatabaseView.js # Widok bazy słów
│   │   │   ├── LearningView.js # Widok nauki
│   │   │   └── index.js
│   │   └── ImportProgress.js   # Komponent postępu importu
│   ├── context/
│   │   └── AppContext.js       # Stan globalny aplikacji
│   ├── services/
│   │   ├── db.js               # Warstwa IndexedDB
│   │   └── api.js              # Integracja z OpenAI API
│   ├── utils/
│   │   ├── index.js            # Funkcje pomocnicze
│   │   └── csv.js              # Parser CSV
│   ├── constants/
│   │   └── index.js            # Stałe aplikacji
│   ├── styles/
│   │   └── index.css           # Style CSS
│   ├── App.js                  # Główny komponent
│   └── index.js                # Punkt wejścia
└── package.json
```

## 🛠️ Technologie

- **React 18** - UI framework
- **IndexedDB** - Lokalna baza danych w przeglądarce
- **OpenAI API** - Generowanie tłumaczeń i przykładów

## 📖 Funkcjonalności

### Baza słów
- Dodawanie słów (rzeczowniki, czasowniki, przymiotniki)
- Import z pliku CSV
- Wyszukiwanie i filtrowanie
- Podgląd i edycja słów
- Statystyki postępu

### Nauka
- System poziomów (0-5)
- Spaced repetition
- Ćwiczenia z lukami
- Odmiana czasowników (18 form)
- Tolerancja akcentów dla początkujących

## 📥 Format CSV

```csv
word,class
dom,noun
jeść,verb
duży,adjective
```

## ⚙️ Konfiguracja

1. Otwórz aplikację
2. Kliknij **⚙️ Ustawienia**
3. Wklej klucz API OpenAI
4. Zapisz

## 🔑 Klucz API

Klucz API OpenAI możesz uzyskać na:
https://platform.openai.com/api-keys

Klucz jest przechowywany lokalnie w przeglądarce (IndexedDB).

## 📦 Build produkcyjny

```bash
npm run build
```

Pliki produkcyjne znajdziesz w folderze `build/`.
