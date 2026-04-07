import React, { useState, useEffect, useCallback } from 'react';
import { HistoryStore, type ScreenshotRecord } from '../lib/historyStore';
import { blobToDataUrl } from '../lib/thumbnailGenerator';
import { IconTrash, IconCopy, IconExternalLink, IconTag, IconSearch, IconCamera } from '../editor/Icons';

interface HistoryEntry {
  id: number;
  thumbnailUrl: string;
  timestamp: string;
  tags: string[];
  captureMode: string;
  url: string;
  title: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTagsId, setEditingTagsId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const records = searchQuery
        ? await HistoryStore.search({ tag: searchQuery })
        : await HistoryStore.getAll({ limit: 100 });

      const mapped = await Promise.all(
        records.map(async (rec: ScreenshotRecord) => ({
          id: rec.id!,
          thumbnailUrl: await blobToDataUrl(rec.thumbnail),
          timestamp: rec.timestamp,
          tags: rec.tags,
          captureMode: rec.captureMode,
          url: rec.url,
          title: rec.title,
        }))
      );
      setEntries(mapped);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleDelete = async (id: number) => {
    await HistoryStore.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCopyToClipboard = async (id: number) => {
    const blob = await HistoryStore.getFullImage(id);
    if (!blob) return;

    try {
      const pngBlob = blob.type === 'image/png' ? blob : await convertToPng(blob);
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob }),
      ]);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleOpenInEditor = async (id: number) => {
    const editorUrl = browser.runtime.getURL(`/editor.html?screenshotId=${id}`);
    await browser.tabs.create({ url: editorUrl });
    window.close();
  };

  const handleSaveTags = async (id: number) => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await HistoryStore.updateTags(id, tags);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, tags } : e))
    );
    setEditingTagsId(null);
    setTagInput('');
  };

  const startEditTags = (entry: HistoryEntry) => {
    setEditingTagsId(entry.id);
    setTagInput(entry.tags.join(', '));
  };

  if (loading) {
    return (
      <div className="history-loading">
        <span className="pulse-dot" />
        Loading history...
      </div>
    );
  }

  if (entries.length === 0 && !searchQuery) {
    return (
      <div className="history-empty">
        <IconCamera />
        <p>No captures yet</p>
        <span>Take a screenshot to see it here</span>
      </div>
    );
  }

  return (
    <div className="history-view">
      <div className="history-search">
        <IconSearch />
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="history-search-input"
        />
      </div>

      {entries.length === 0 && searchQuery && (
        <div className="history-empty">
          <p>No matches found</p>
          <span>Try a different search term</span>
        </div>
      )}

      <div className="history-grid">
        {entries.map((entry) => (
          <div key={entry.id} className="history-card">
            <div
              className="history-card-thumb"
              onClick={() => handleOpenInEditor(entry.id)}
            >
              <img src={entry.thumbnailUrl} alt={`Capture ${entry.id}`} />
              <div className="history-card-overlay">
                <span>Open</span>
              </div>
            </div>

            <div className="history-card-meta">
              <span className="history-card-time">
                {relativeTime(entry.timestamp)}
              </span>
              <span className="history-card-mode">{entry.captureMode}</span>
            </div>

            {editingTagsId === entry.id ? (
              <div className="history-tag-editor">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTags(entry.id);
                    if (e.key === 'Escape') setEditingTagsId(null);
                  }}
                  placeholder="tag1, tag2, ..."
                  autoFocus
                  className="history-tag-input"
                />
                <button
                  onClick={() => handleSaveTags(entry.id)}
                  className="history-tag-save"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="history-card-tags" onClick={() => startEditTags(entry)}>
                {entry.tags.length > 0 ? (
                  entry.tags.map((tag) => (
                    <span key={tag} className="history-tag-chip">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="history-tag-add">
                    <IconTag /> Add tags
                  </span>
                )}
              </div>
            )}

            <div className="history-card-actions">
              <button
                onClick={() => handleOpenInEditor(entry.id)}
                title="Open in Editor"
                className="history-action-btn"
              >
                <IconExternalLink />
              </button>
              <button
                onClick={() => handleCopyToClipboard(entry.id)}
                title="Copy to Clipboard"
                className="history-action-btn"
              >
                <IconCopy />
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                title="Delete"
                className="history-action-btn history-action-delete"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function convertToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/png' });
}
