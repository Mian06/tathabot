import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './App.css';

const translations = {
  en: {
    title: 'Tathabot',
    subtitle: 'AI Research Assistant',
    placeholder: 'Ask anything to start researching...',
    button: 'Search',
    toggle: 'العربية',
    loading: 'Searching...',
    footer: 'Powered by Perplexity Sonar',
    disclaimer: 'AI may make mistakes. Verify important information.',
  },
  ar: {
    title: 'تطابوت',
    subtitle: 'مساعد البحث الذكي',
    placeholder: 'اسأل أي شيء للبدء في البحث...',
    button: 'بحث',
    toggle: 'English',
    loading: 'جاري البحث...',
    footer: 'مدعوم من Perplexity Sonar',
    disclaimer: 'قد يخطئ الذكاء الاصطناعي. تحقق من المعلومات المهمة.',
  }
};

function App() {
  const [lang, setLang] = useState('ar');
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortControllerRef = useRef(null);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    if (!hasSearched) {
      setHasSearched(true);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setAnswer('');

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), lang }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) setAnswer((prev) => prev + content);
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') setAnswer('Error: ' + err.message);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className={`app-container ${hasSearched ? 'has-searched' : 'idle-state'}`}>
      <header className="header">
        <div className="brand-group">
          <h1>{t.title}</h1>
          <span className="subtitle-badge">{t.subtitle}</span>
        </div>
        <button className="lang-toggle-btn" onClick={toggleLang}>
          {t.toggle}
        </button>
      </header>

      <main className="main-content">
        <form onSubmit={handleSubmit} className="search-form">
          <div className="input-wrapper">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.placeholder}
              className="search-input"
              disabled={loading}
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? (
                <span className="btn-loading-state">
                  <span className="mini-spinner"></span>
                  {t.loading}
                </span>
              ) : (
                t.button
              )}
            </button>
          </div>
        </form>

        {hasSearched && (
          <section className="response-card">
            {loading && !answer && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
              </div>
            )}

            {answer && (
              <div className={`answer-text ${lang === 'ar' ? 'rtl-text' : 'ltr-text'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // --- FIX: Open source URLs in new tab ---
                    a: ({ href, children, ...props }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {answer}
                </ReactMarkdown>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>{t.footer}</p>
        <p className="disclaimer">{t.disclaimer}</p>
      </footer>
    </div>
  );
}

export default App;
