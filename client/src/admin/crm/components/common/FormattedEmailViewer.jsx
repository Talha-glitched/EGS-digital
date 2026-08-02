import { useState, useRef, useEffect, useMemo } from 'react';
import { Eye, FileText, Code } from 'lucide-react';

function stripLatestSubjectPrefix(str = '') {
  return String(str || '')
    .replace(/Latest subject: "[^"]*"\s*/gi, '')
    .replace(/\[cid:[^\]]+\]/gi, '')
    .replace(/\[picture-[^\]]+\]/gi, '')
    .replace(/\[hct[^\]]+\]/gi, '')
    .replace(/\[onenation[^\]]+\]/gi, '')
    .replace(/\[[a-z0-9_\-\.]+\.(png|jpg|jpeg|gif|svg)\]/gi, '')
    .replace(/â€¯/g, ' ')
    .replace(/\u202f/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function parseEmailBodyToOutlookHtml(text = '') {
  let cleanText = stripLatestSubjectPrefix(text);
  if (!cleanText || (/^(Automatic reply:|Auto:|Re:)/i.test(cleanText) && cleanText.length < 90)) {
    return `<div style="font-size: 13px; font-weight: 500; color: #64748b; background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; text-align: center;">
      <strong>Auto-Responder Notification:</strong> Sender sent an automated receipt with no additional body text.
    </div>`;
  }

  cleanText = cleanText.replace(/â€¯/g, ' ').replace(/\u202f/g, ' ');

  let mainMessage = cleanText;
  let quotedThread = '';

  const quoteMatch = cleanText.match(
    /([\s\S]*?)(?:\r?\n)(On\s+[\s\S]+?wrote:|From:\s+[\s\S]+?Subject:|Von:\s+[\s\S]+?Betreff:|________________________________|>\s?[\s\S]*)/i
  );

  if (quoteMatch && quoteMatch[1].trim()) {
    mainMessage = quoteMatch[1].trim();
    quotedThread = quoteMatch[2].trim();
  } else if (/^>\s?/.test(cleanText)) {
    mainMessage = '';
    quotedThread = cleanText;
  }

  const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const linkify = (s) =>
    s.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noreferrer" style="color: #0284c7; text-decoration: underline;">$1</a>'
    );

  const renderLines = (str) => {
    const lines = str.replace(/\r\n/g, '\n').split('\n');
    let html = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        html += `<div style="height: 12px;"></div>`;
      } else {
        html += `<div style="margin-bottom: 6px; line-height: 1.55; font-size: 13.5px; color: #0f172a; word-wrap: break-word;">${linkify(escapeHtml(trimmed))}</div>`;
      }
    }
    return html;
  };

  let html = renderLines(mainMessage);

  if (quotedThread) {
    const cleanThread = quotedThread
      .split(/\r?\n/)
      .map((l) => l.replace(/^>\s?/, ''))
      .join('\n')
      .trim();

    html += `<div style="margin-top: 16px; border-left: 3px solid #0284c7; padding-left: 12px; background: #f8fafc; border-radius: 6px; padding-top: 10px; padding-bottom: 10px;">`;
    html += `<div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; margin-bottom: 6px; letter-spacing: 0.05em;">Original Email Thread</div>`;
    html += renderLines(cleanThread);
    html += `</div>`;
  }

  return html;
}

export default function FormattedEmailViewer({ html = '', text = '', className = '', defaultView = 'html', maxHeight = 500 }) {
  const cleanText = useMemo(() => stripLatestSubjectPrefix(text), [text]);
  const cleanHtml = useMemo(() => stripLatestSubjectPrefix(html), [html]);

  const effectiveHtml = useMemo(() => {
    if (cleanHtml && /<[a-z][\s\S]*>/i.test(cleanHtml) && cleanHtml.includes('margin-bottom:')) return cleanHtml;
    if (cleanText && /<[a-z][\s\S]*>/i.test(cleanText)) return cleanText;
    return parseEmailBodyToOutlookHtml(cleanText);
  }, [cleanHtml, cleanText]);

  const fullHtmlDocument = useMemo(() => {
    if (!effectiveHtml) return '';
    if (/^\s*<!DOCTYPE|^\s*<html/i.test(effectiveHtml)) {
      return effectiveHtml;
    }
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              font-size: 13.5px;
              line-height: 1.55;
              color: #0f172a;
              margin: 0;
              padding: 12px;
              background-color: transparent;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            div { word-wrap: break-word; }
            a { color: #0284c7; text-decoration: underline; font-weight: 500; }
            img { max-width: 100% !important; height: auto !important; border-radius: 4px; }
            table { max-width: 100% !important; border-collapse: collapse; }
            blockquote { border-left: 3px solid #0284c7; margin: 10px 0; padding-left: 12px; color: #475569; background-color: #f8fafc; }
            pre, code { font-family: inherit; whitespace: pre-wrap; }
          </style>
        </head>
        <body>
          ${effectiveHtml}
        </body>
      </html>
    `;
  }, [effectiveHtml]);

  const [viewMode, setViewMode] = useState('html');
  const iframeRef = useRef(null);
  const [iframeHeight, setIframeHeight] = useState(220);

  useEffect(() => {
    if (iframeRef.current && viewMode === 'html') {
      const timer = setTimeout(() => {
        try {
          const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
          if (doc) {
            const h = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
            if (h > 0) {
              setIframeHeight(Math.min(h + 28, typeof maxHeight === 'number' ? maxHeight : 500));
            }
          }
        } catch {
          // fallback
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fullHtmlDocument, viewMode, maxHeight]);

  const handleIframeLoad = () => {
    if (!iframeRef.current) return;
    try {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        const bodyHeight = Math.max(doc.body?.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
        if (bodyHeight > 0) {
          setIframeHeight(Math.min(bodyHeight + 28, typeof maxHeight === 'number' ? maxHeight : 500));
        }
      }
    } catch {
      // Cross-origin fallback
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-3 py-1.5 text-xs text-slate-500">
        <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Code className="h-3.5 w-3.5 text-sky-600" />
          {viewMode === 'html' ? 'HTML' : 'Plain Text'}
        </span>
        <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('html')}
            className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-md text-[11px] font-bold transition ${
              viewMode === 'html' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Eye className="h-3 w-3" />
            HTML
          </button>
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-md text-[11px] font-bold transition ${
              viewMode === 'text' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="h-3 w-3" />
            Plain Text
          </button>
        </div>
      </div>

      <div className="p-2.5 overflow-y-auto" style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}>
        {viewMode === 'html' ? (
          <iframe
            ref={iframeRef}
            srcDoc={fullHtmlDocument}
            onLoad={handleIframeLoad}
            title="Email Content"
            className="w-full border-0 block bg-transparent"
            style={{ height: `${iframeHeight}px` }}
            sandbox="allow-same-origin allow-popups"
          />
        ) : (
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans p-2 bg-slate-50/50 rounded-lg border border-slate-100">
            {cleanText || 'No text content available.'}
          </div>
        )}
      </div>
    </div>
  );
}
