import React, { useState, useEffect, useCallback } from 'react';
import { HistoryStore, ScreenshotRecord } from '../../utils/historyStore';
import { IconSearch, IconTrash, IconExternalLink, IconCopy, IconTag } from '../editor/Icons';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryView() {
  const [records, setRecords] = useState<ScreenshotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let results: ScreenshotRecord[];
      if (searchText || dateFrom || dateTo) {
        results = await HistoryStore.search({
          tagText: searchText || undefined,
          startDate: dateFrom ? new Date(dateFrom).toISOString() : undefined,
          endDate: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined,
        });
      } else {
        results = await HistoryStore.getAll(true);
      }
      setRecords(results);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    setLoading(false);
  }, [searchText, dateFrom, dateTo]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleDelete = async (id: number) => {
    await HistoryStore.delete(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOpenEditor = async (id: number) => {
    const editorUrl = browser.runtime.getURL(`/editor.html?screenshotId=${id}`);
    await browser.tabs.create({ url: editorUrl });
  };

  const handleCopyToClipboard = async (id: number) => {
    try {
      const dataUrl = await HistoryStore.getFullImage(id);
      if (!dataUrl) return;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const handleSaveTags = async (id: number) => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await HistoryStore.updateTags(id, tags);
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, tags } : r))
    );
    setEditingTagsId(null);
    setTagInput('');
  };

  const startEditTags = (record: ScreenshotRecord) => {
    setEditingTagsId(record.id!);
    setTagInput(record.tags.join(', '));
  };

  if (loading) {
    return (
      <div className="history-empty">
        <span className="pulse-dot" />
        Loading history...
      </div>
    );
  }

  if (records.length === 0 && !searchText && !dateFrom && !dateTo) {
    return (
      <div className="history-empty">
        <div className="history-empty-icon">📷</div>
        <div className="history-empty-title">No captures yet</div>
        <div className="history-empty-desc">
          Switch to the Capture tab to take your first screenshot
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-search-bar">
        <div className="history-search-input-wrap">
          <IconSearch />
          <input
            type="text"
            className="history-search-input"
            placeholder="Search tags..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button
          className="history-filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          title="Date filter"
        >
          ⏱
        </button>
      </div>

      {showFilters && (
        <div className="history-date-filters">
          <input
            type="date"
            className="history-date-input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From"
          />
          <span className="history-date-sep">–</span>
          <input
            type="date"
            className="history-date-input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To"
          />
        </div>
      )}

      {records.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-desc">No matches found</div>
        </div>
      ) : (
        <div className="history-grid">
          {records.map((record) => (
            <div key={record.id} className="history-card">
              <div className="history-card-thumb">
                <img src={record.thumbnail} alt="Screenshot" />
                <div className="history-card-actions">
                  <button
                    onClick={() => handleOpenEditor(record.id!)}
                    title="Open in Editor"
                  >
                    <IconExternalLink />
                  </button>
                  <button
                    onClick={() => handleCopyToClipboard(record.id!)}
                    title="Copy to Clipboard"
                  >
                    <IconCopy />
                  </button>
                  <button
                    onClick={() => startEditTags(record)}
                    title="Edit Tags"
                  >
                    <IconTag />
                  </button>
                  <button
                    onClick={() => handleDelete(record.id!)}
                    title="Delete"
                    className="history-action-delete"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
              <div className="history-card-meta">
                <span className="history-card-time">
                  {relativeTime(record.timestamp)}
                </span>
                <span className="history-card-mode">{record.captureMode}</span>
              </div>
              {editingTagsId === record.id ? (
                <div className="history-tag-editor">
                  <input
                    type="text"
                    className="history-tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTags(record.id!);
                      if (e.key === 'Escape') setEditingTagsId(null);
                    }}
                    placeholder="tag1, tag2, ..."
                    autoFocus
                  />
                  <button
                    className="history-tag-save"
                    onClick={() => handleSaveTags(record.id!)}
                  >
                    ✓
                  </button>
                </div>
              ) : (
                record.tags.length > 0 && (
                  <div className="history-card-tags">
                    {record.tags.map((tag, i) => (
                      <span key={i} className="history-tag-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      <div className="history-count">
        {records.length} capture{records.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
