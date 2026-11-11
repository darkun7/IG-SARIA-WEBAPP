import React, { useState, useCallback } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { compareLists, parseListFile, parseZipFile, type CompareResult, type UploadMode } from './parser';
import { useI18n } from './i18n';
import { useTheme } from './theme';
import ResultsDisplay from './components/ResultsDisplay';
import HowToGuide from './components/HowToGuide';
import {
  FileArchiveIcon,
  FileTextIcon,
  UploadCloudIcon,
} from './components/Icons';
import PrivacyPolicy from './pages/PrivacyPolicy';

interface ParsedFile {
  file: File;
  name: string;
}

let comparing = false;
const MAX_UPLOAD_SIZE = 200 * 1024 * 1024;

export default function App() {
  const { t } = useI18n();
  const [uploadMode, setUploadMode] = useState<UploadMode>('zip');
  const [files, setFiles] = useState<{
    followers: ParsedFile | null;
    following: ParsedFile | null;
    zip: ParsedFile | null;
  }>({ followers: null, following: null, zip: null });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompareResult | null>(null);
  const [dragging, setDragging] = useState<'followers' | 'following' | 'zip' | null>(null);

  const onFileChange = useCallback((side: 'followers' | 'following' | 'zip', file: File) => {
    if (!file.size) {
      toast.error(t('toast.emptyFile', { name: file.name }));
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE) {
      toast.error(t('toast.fileTooLarge'));
      return;
    }
    setFiles(prev => side === 'zip'
      ? { followers: null, following: null, zip: { file, name: file.name } }
      : { ...prev, zip: null, [side]: { file, name: file.name } });
    setResults(null);
    toast.success(t('toast.loaded', { name: file.name }), { position: 'top-center' });
  }, [t]);

  const handleModeChange = useCallback((mode: UploadMode) => {
    setUploadMode(mode);
    setFiles({ followers: null, following: null, zip: null });
    setResults(null);
    setDragging(null);
  }, []);

  const handleCompare = useCallback(async () => {
    const hasRequiredFiles = uploadMode === 'zip'
      ? Boolean(files.zip)
      : Boolean(files.followers && files.following);
    if (!hasRequiredFiles) {
      toast.error(t(uploadMode === 'zip' ? 'toast.zipRequired' : 'toast.bothFilesRequired'));
      return;
    }
    if (comparing) return;

    setLoading(true);
    comparing = true;

    try {
      let result: CompareResult;
      if (uploadMode === 'zip' && files.zip) {
        const parsed = await parseZipFile(files.zip.file);
        result = compareLists(parsed.followers, parsed.following);
      } else if (files.followers && files.following) {
        const listMode = uploadMode === 'zip' ? 'json' : uploadMode;
        const [followers, following] = await Promise.all([
          parseListFile(files.followers.file, listMode),
          parseListFile(files.following.file, listMode),
        ]);
        if (!followers.length || !following.length) {
          throw new Error(t('toast.invalidExport'));
        }
        result = compareLists(followers, following);
      } else {
        throw new Error(t(uploadMode === 'zip' ? 'toast.zipRequired' : 'toast.bothFilesRequired'));
      }
      setResults(result);
      toast.success(t('toast.comparisonDone'));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || err?.message || t('toast.error'));
      setResults(null);
    } finally {
      setLoading(false);
      comparing = false;
    }
  }, [files, uploadMode, t]);

  const reset = useCallback(() => {
    setFiles({ followers: null, following: null, zip: null });
    setResults(null);
  }, []);

  return (
    <Routes>
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<HomePage uploadMode={uploadMode} files={files} loading={loading} results={results} dragging={dragging} setDragging={setDragging} onModeChange={handleModeChange} onFileChange={onFileChange} handleCompare={handleCompare} reset={reset} t={t} />} />
    </Routes>
  );
}

function HomePage({
  uploadMode, files, loading, results, dragging, setDragging, onModeChange, onFileChange, handleCompare, reset, t,
}: {
  uploadMode: UploadMode;
  files: { followers: ParsedFile | null; following: ParsedFile | null; zip: ParsedFile | null };
  loading: boolean;
  results: CompareResult | null;
  dragging: 'followers' | 'following' | 'zip' | null;
  setDragging: React.Dispatch<React.SetStateAction<'followers' | 'following' | 'zip' | null>>;
  onModeChange: (mode: UploadMode) => void;
  onFileChange: (side: 'followers' | 'following' | 'zip', file: File) => void;
  handleCompare: () => void;
  reset: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-gray-200 dark:border-white/5">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/5 dark:bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          <div className="absolute top-4 left-4 flex flex-col items-start gap-2">
            <a
              href="https://ganknow.com/0x5879"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('support.aria')}
              className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-black/15 transition-colors hover:bg-gray-800"
            >
              <img
                src="https://play-lh.googleusercontent.com/auYuei2J0Qk5IJeL-aSv-SNd2Dq8i8DUBwfnInCbdqhdXucyfEenat1J-6KfSuTAK6-GNfX7RFwjbOgZTto0"
                alt="Ganknow"
                className="h-5 w-5 rounded-md object-cover"
                loading="lazy"
              />
              <span>{t('support.label')}</span>
            </a>
            <a
              href="https://chromewebstore.google.com/detail/ig-saria/miofeejbonlhkhineeemennccankkhlh?authuser=0&hl=en"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('extension.aria')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 shadow-md shadow-slate-900/10 transition-colors hover:bg-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              <img
                src="https://freeaidirectories.com/api/files/tools/chrome-extension-downloader-logo.png"
                alt="Chrome extension"
                className="h-5 w-5 rounded-md object-cover"
                loading="lazy"
              />
              <span>{t('extension.label')}</span>
            </a>
          </div>
          <div className="flex justify-end items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
          <h1 className="text-center text-4xl md:text-5xl font-bold mb-3">
            <span className="text-gray-900 dark:text-white">IG </span>
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-purple-400 bg-clip-text text-transparent">SARIA</span>
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 max-w-md mx-auto text-base leading-relaxed">
            {t('header.subtitle')}
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-24">
        {/* How-to guide */}
        <HowToGuide />

        <FormatPicker mode={uploadMode} onChange={onModeChange} t={t} />

        {/* Upload Area */}
        <section className="mt-10 -mb-8">
          {uploadMode === 'zip' ? (
          <div className={`max-w-2xl mx-auto transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <FileUploadBox
              label={t('box.zip.label')}
              subtitle={t('box.zip.subtitle')}
              fileName={files.zip?.name ?? null}
              dragging={dragging === 'zip'}
              side="zip"
              accept=".zip,application/zip"
              onDragEnter={() => setDragging('zip')}
              onDragLeave={() => setDragging(null)}
              onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) onFileChange('zip', f); }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange('zip', f); }}
            />
          </div>
          ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <FileUploadBox
              label={t('box.followers.label')}
              subtitle={t('box.followers.subtitle')}
              fileName={files.followers?.name ?? null}
              dragging={dragging === 'followers'}
              side="followers"
              accept={acceptForMode(uploadMode)}
              onDragEnter={() => setDragging('followers')}
              onDragLeave={() => setDragging(null)}
              onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) onFileChange('followers', f); }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange('followers', f); }}
            />
            <FileUploadBox
              label={t('box.following.label')}
              subtitle={t('box.following.subtitle')}
              fileName={files.following?.name ?? null}
              dragging={dragging === 'following'}
              side="following"
              accept={acceptForMode(uploadMode)}
              onDragEnter={() => setDragging('following')}
              onDragLeave={() => setDragging(null)}
              onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) onFileChange('following', f); }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange('following', f); }}
            />
          </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            {results && (
              <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors font-medium text-sm">
                {t('action.newComparison')}
              </button>
            )}
            <button
              disabled={(uploadMode === 'zip' ? !files.zip : !files.followers || !files.following) || loading}
              onClick={handleCompare}
              className={`px-10 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200
                ${(uploadMode === 'zip' ? files.zip : files.followers && files.following)
                  ? 'bg-gradient-to-r from-emerald-500 to-purple-500 hover:from-emerald-600 hover:to-purple-600 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none"/></svg>
                  {t('action.comparing')}
                </span>
              ) : t('action.compare')}
            </button>
          </div>
        </section>

        <hr className="border-gray-200 dark:border-white/5 my-16" />

        {/* Results */}
        {results && <ResultsDisplay results={results} />}

        {/* Empty State */}
        {!results && !loading && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/5 mb-6">
              <svg className="w-10 h-10 text-gray-400 dark:text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"/>
              </svg>
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-lg">{t(uploadMode === 'zip' ? 'empty.zipTitle' : 'empty.title')}</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-white/5 py-8 text-center">
        <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">
          {t('footer.text')}
        </p>
        <Link to="/privacy" className="text-gray-400 dark:text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 text-sm transition-colors">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}

function acceptForMode(mode: Exclude<UploadMode, 'zip'>): string {
  if (mode === 'json') return '.json,application/json';
  if (mode === 'html') return '.html,.htm,text/html';
  return '.csv,.txt,text/csv,text/plain';
}

function FormatPicker({
  mode, onChange, t,
}: {
  mode: UploadMode;
  onChange: (mode: UploadMode) => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) {
  const options: Array<{ value: UploadMode; label: string; description: string }> = [
    { value: 'zip', label: t('format.zip.label'), description: t('format.zip.description') },
    { value: 'json', label: t('format.json.label'), description: t('format.json.description') },
    { value: 'html', label: t('format.html.label'), description: t('format.html.description') },
    { value: 'csv', label: t('format.csv.label'), description: t('format.csv.description') },
  ];

  return (
    <section className="max-w-4xl mx-auto mt-10">
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('format.title')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('format.subtitle')}</p>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{t('format.local')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" role="radiogroup" aria-label={t('format.title')}>
          {options.map((option) => {
            const selected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(option.value)}
                className={`text-left rounded-xl border px-4 py-3 transition-all ${selected
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-400/60 dark:bg-emerald-500/10 shadow-sm'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${selected ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                  <span className="font-semibold text-sm text-gray-800 dark:text-white">{option.label}</span>
                </span>
                <span className="block text-xs text-gray-400 dark:text-gray-500 mt-1">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}


/* ---------- Theme Toggle ---------- */

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.03] hover:bg-gray-200 dark:hover:bg-white/[0.06] transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <svg className="w-4 h-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}


/* ---------- File Upload Box Component ---------- */

interface BoxProps {
  label: string;
  subtitle: string;
  fileName: string | null;
  dragging: boolean;
  side: 'followers' | 'following' | 'zip';
  accept: string;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FileUploadBox({
  label, subtitle, fileName, dragging, side, accept,
  onDragEnter, onDragLeave, onDrop, onChange,
}: BoxProps) {
  const { t } = useI18n();
  const colorMap = {
    followers: { accent: 'from-emerald-400 to-green-500', dot: 'bg-emerald-400' },
    following: { accent: 'from-purple-400 to-violet-500', dot: 'bg-purple-400' },
    zip: { accent: 'from-teal-400 to-cyan-500', dot: 'bg-teal-400' },
  };
  const colors = colorMap[side];
  const FileIcon = fileName
    ? side === 'zip' ? FileArchiveIcon : FileTextIcon
    : UploadCloudIcon;

  return (
    <div
      onDragEnter={onDragEnter}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`relative rounded-2xl border-2 transition-all duration-200 ${
        dragging
          ? `${colors.dot.replace('bg-', 'border-')} bg-gray-50 dark:bg-white/[0.02] scale-[1.01]`
          : fileName
            ? 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]'
            : 'border-dashed border-gray-300 dark:border-white/15 bg-white dark:bg-white/[0.01] hover:bg-gray-50 dark:hover:bg-white/[0.03] hover:border-gray-400 dark:hover:border-white/25'
      } p-6`}
    >
      {/* Accent line at top */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${colors.accent} to-transparent opacity-50`} />

      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
          <FileIcon className={`w-6 h-6 ${fileName ? colors.dot.replace('bg-', 'text-') : 'text-gray-400'}`} />
        </div>

        {/* Label */}
        <h3 className={`font-semibold mb-1 ${fileName ? '' : 'text-gray-500 dark:text-gray-400'}`}>{label}</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{subtitle}</p>

        {fileName ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5">
            <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-[180px]">{fileName}</span>
          </div>
        ) : (
          <label className="cursor-pointer group">
            <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-500 text-sm font-medium text-white group-hover:from-emerald-600 group-hover:to-purple-600 transition-all">
              {t('box.chooseFile')}
            </span>
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={onChange}
            />
          </label>
        )}

        {!fileName && (
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">{t('box.hint')}</p>
        )}
      </div>

      <input
        type="file"
        accept={accept}
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={onChange}
        title=""
        aria-label={label}
      />
    </div>
  );
}

/* ---------- Language Toggle ---------- */

function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.03] p-1">
      <button
        onClick={() => setLang('id')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          lang === 'id' ? 'bg-gradient-to-r from-emerald-500 to-purple-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <span className="sm:hidden">ID</span>
        <span className="hidden sm:inline">Indonesia</span>
      </button>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          lang === 'en' ? 'bg-gradient-to-r from-emerald-500 to-purple-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <span className="sm:hidden">EN</span>
        <span className="hidden sm:inline">English</span>
      </button>
    </div>
  );
}
