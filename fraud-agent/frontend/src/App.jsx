import React, { useState, useEffect, useRef, useCallback } from 'react';
import Stream from './components/Stream.jsx';
import Queue from './components/Queue.jsx';
import Detail from './components/Detail.jsx';

const BACKEND = 'http://localhost:3001';
const MAX_EVENTS = 30;

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map((line, i) => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, j) => { obj[h] = values[j] || ''; });
    if (!obj.id) obj.id = `txn_${Date.now()}_${i}`;
    return obj;
  });
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '0.5px solid var(--color-border-primary)',
      borderRadius: 'var(--border-radius-md)',
      padding: '12px 16px',
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{
        fontSize: 22,
        fontWeight: 700,
        color: color || 'var(--color-text-primary)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const fileInputRef = useRef(null);

  const connectSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`${BACKEND}/stream`);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'processing') return;

        setEvents(prev => {
          const next = [data, ...prev].slice(0, MAX_EVENTS);
          return next;
        });

        if (data.status && data.status !== 'cleared') {
          setQueue(prev => {
            const existing = prev.findIndex(i => i.id === data.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = data;
              return updated;
            }
            return [data, ...prev];
          });

          setSelected(prev => {
            if (prev && prev.id === data.id) return data;
            return prev;
          });
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connectSSE, 3000);
    };
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, [connectSSE]);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const transactions = parseCSV(text);

    try {
      await fetch(`${BACKEND}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }

    e.target.value = '';
  }

  const totalProcessed = events.filter(e => e.status).length;
  const autoCleared = events.filter(e => e.status === 'cleared').length;
  const inQueue = queue.filter(i => i.status === 'awaiting_context' || i.status === 'human_review').length;
  const autoBlocked = events.filter(e => e.status === 'auto_blocked').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-background-secondary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Bar */}
      <div style={{
        background: 'var(--color-background-primary)',
        borderBottom: '0.5px solid var(--color-border-primary)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
          }}>
            🛡
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
            Fraud Agent
          </span>
          <span style={{ color: 'var(--color-border-secondary)', fontSize: 18, lineHeight: 1 }}>|</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
            Financial Intelligence Dashboard
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: connected ? '#1a7f4b' : 'var(--color-text-tertiary)',
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: connected ? '#22c55e' : '#8a94a6',
              display: 'inline-block',
            }} />
            {connected ? 'Connected' : 'Reconnecting…'}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--border-radius-md)',
              border: '0.5px solid var(--color-border-secondary)',
              background: 'var(--color-background-secondary)',
              color: 'var(--color-text-primary)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Stat Bar */}
      <div style={{
        padding: '16px 24px 0',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <StatCard label="Total Processed" value={totalProcessed} />
        <StatCard label="Auto-Cleared" value={autoCleared} color="#1a7f4b" />
        <StatCard label="In Queue" value={inQueue} color="#92600a" />
        <StatCard label="Auto-Blocked" value={autoBlocked} color="#c0392b" />
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: 'auto auto',
        gap: 16,
        padding: 24,
        paddingTop: 16,
        flex: 1,
      }}>
        <Stream events={events} />
        <Queue items={queue} onSelect={setSelected} selected={selected} />
        <div style={{ gridColumn: '1 / -1' }}>
          <Detail item={selected} />
        </div>
      </div>
    </div>
  );
}
