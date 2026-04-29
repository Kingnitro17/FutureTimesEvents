'use client';
import { useState, useRef, useEffect } from 'react';
import { MOCK_TICKETS } from '@/lib/mockData';

type ScanResult = 'idle' | 'scanning' | 'valid' | 'invalid' | 'face-scanning' | 'face-matched';

export default function CheckInPage() {
  const [mode, setMode] = useState<'qr'|'manual'|'face'>('qr');
  const [result, setResult] = useState<ScanResult>('idle');
  const [manualId, setManualId] = useState('');
  const [scannedTicket, setScannedTicket] = useState<typeof MOCK_TICKETS[0]|null>(null);
  const [checkedInCount, setCheckedInCount] = useState(847);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState(0);
  const scanIntervalRef = useRef<NodeJS.Timeout|null>(null);

  useEffect(() => {
    const fn = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', fn); window.addEventListener('offline', fn);
    return () => { window.removeEventListener('online', fn); window.removeEventListener('offline', fn); };
  }, []);

  const simulateScan = (id?: string) => {
    setResult('scanning');
    setTimeout(() => {
      const ticketId = id || MOCK_TICKETS[Math.floor(Math.random()*MOCK_TICKETS.length)].ticketId;
      const found = MOCK_TICKETS.find(t => t.ticketId === ticketId || t.ticketId.includes(ticketId));
      if (found) {
        setScannedTicket(found);
        setResult('valid');
        if (isOnline) setCheckedInCount(c => c+1);
        else setOfflineQueue(q => q+1);
      } else {
        setScannedTicket(null);
        setResult('invalid');
      }
      setTimeout(() => setResult('idle'), 4000);
    }, 1800);
  };

  const simulateFace = () => {
    setResult('face-scanning');
    setTimeout(() => {
      setResult('face-matched');
      setCheckedInCount(c => c+1);
      setTimeout(() => setResult('idle'), 4000);
    }, 3000);
  };

  const syncOffline = () => {
    if (offlineQueue > 0) { setCheckedInCount(c => c+offlineQueue); setOfflineQueue(0); }
  };

  return (
    <div className="min-h-screen pt-[var(--nav-h)] pb-20 bg-[var(--bg-secondary)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-black text-[var(--text)] mb-1">Check-in POS</h1>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isOnline?'bg-green-400':'bg-red-400'} animate-pulse`} />
              <span className="text-xs text-[var(--text-muted)]">{isOnline?'Online':'Offline Mode'}</span>
              {!isOnline && offlineQueue > 0 && (
                <button onClick={syncOffline} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background:'linear-gradient(135deg,#46FFAB,#A02EFF)' }}>
                  Sync {offlineQueue} pending
                </button>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="font-black text-3xl text-[var(--text)]">{checkedInCount}</div>
            <div className="text-xs text-[var(--text-muted)]">Checked In</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-6">
          {([['qr','📷 QR Scanner'],['manual','⌨️ Manual'],['face','🤖 Face ID']] as const).map(([m,label]) => (
            <button key={m} onClick={()=>{setMode(m);setResult('idle');}}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${mode===m?'text-white border-transparent':'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-card)]'}`}
              style={mode===m?{background:'linear-gradient(135deg,#FF55C2,#7222E3)'}:{}}>
              {label}
            </button>
          ))}
        </div>

        {/* QR Scanner */}
        {mode === 'qr' && (
          <div className="glass rounded-2xl p-6 border border-[var(--border)] text-center mb-4">
            <div className="relative mx-auto w-64 h-64 mb-6">
              {/* Camera frame */}
              <div className="w-full h-full rounded-2xl bg-black/80 dark:bg-black flex items-center justify-center overflow-hidden relative">
                {result === 'scanning' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent animate-bounce" style={{ boxShadow:'0 0 20px #FF55C2' }} />
                  </div>
                ) : result === 'valid' ? (
                  <div className="text-5xl animate-bounce">✅</div>
                ) : result === 'invalid' ? (
                  <div className="text-5xl">❌</div>
                ) : (
                  <div className="text-4xl opacity-50">📷</div>
                )}
                {/* Corner frames */}
                {['top-2 left-2 border-t-2 border-l-2','top-2 right-2 border-t-2 border-r-2','bottom-2 left-2 border-b-2 border-l-2','bottom-2 right-2 border-b-2 border-r-2'].map((pos,i) => (
                  <div key={i} className={`absolute w-6 h-6 ${pos} border-pink-500 rounded-sm`} />
                ))}
              </div>
            </div>
            {result === 'idle' && <p className="text-sm text-[var(--text-muted)] mb-4">Position QR code in the frame</p>}
            {result === 'scanning' && <p className="text-sm text-purple-500 mb-4 font-medium">Scanning…</p>}
            {result === 'valid' && scannedTicket && (
              <div className="mb-4 p-3 rounded-xl text-left" style={{ background:'linear-gradient(135deg,rgba(70,255,171,0.1),rgba(160,46,255,0.1))', border:'1px solid rgba(70,255,171,0.3)' }}>
                <p className="text-sm font-bold text-green-500 mb-1">✓ Valid Ticket</p>
                <p className="text-xs text-[var(--text)]">{scannedTicket.event.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{scannedTicket.tier.name} · {scannedTicket.holderName}</p>
              </div>
            )}
            {result === 'invalid' && (
              <div className="mb-4 p-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-sm font-bold text-red-500">✗ Invalid Ticket — Access Denied</p>
              </div>
            )}
            <button onClick={()=>simulateScan()} disabled={result==='scanning'}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 hover:scale-[1.02] transition-transform"
              style={{ background:'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
              {result==='scanning'?'Scanning…':'Simulate Scan'}
            </button>
          </div>
        )}

        {/* Manual entry */}
        {mode === 'manual' && (
          <div className="glass rounded-2xl p-6 border border-[var(--border)] mb-4">
            <h2 className="font-semibold text-[var(--text)] mb-4">Enter Ticket ID</h2>
            <input value={manualId} onChange={e=>setManualId(e.target.value)}
              placeholder="e.g. VYB-1746300001-A3F9"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text)] text-sm font-mono outline-none focus:border-purple-400 transition-colors placeholder-[var(--text-muted)] mb-4" />
            {result==='valid' && scannedTicket && (
              <div className="mb-4 p-3 rounded-xl" style={{ background:'rgba(70,255,171,0.1)', border:'1px solid rgba(70,255,171,0.3)' }}>
                <p className="text-sm font-bold text-green-500 mb-1">✓ Valid Ticket</p>
                <p className="text-xs text-[var(--text)]">{scannedTicket.event.title} · {scannedTicket.tier.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Holder: {scannedTicket.holderName}</p>
              </div>
            )}
            {result==='invalid' && <div className="mb-4 p-3 rounded-xl text-sm font-bold text-red-500" style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)' }}>✗ Ticket not found</div>}
            <div className="flex gap-2">
              <button onClick={()=>simulateScan(manualId)} disabled={result==='scanning'}
                className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background:'linear-gradient(135deg,#FF55C2,#7222E3)' }}>
                {result==='scanning'?'Checking…':'Validate Ticket'}
              </button>
              <button onClick={()=>simulateScan(MOCK_TICKETS[0].ticketId)}
                className="px-4 py-3 rounded-xl text-sm border border-[var(--border)] text-[var(--text-muted)] hover:border-purple-400">
                Demo
              </button>
            </div>
          </div>
        )}

        {/* Face ID */}
        {mode === 'face' && (
          <div className="glass rounded-2xl p-6 border border-[var(--border)] text-center mb-4">
            <div className="relative mx-auto w-64 h-64 mb-6">
              <div className="w-full h-full rounded-full bg-black/80 flex items-center justify-center overflow-hidden border-4 border-dashed"
                style={{ borderColor: result==='face-matched'?'#46FFAB':result==='face-scanning'?'#FF55C2':'#533885' }}>
                {result==='face-scanning' ? (
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2 animate-pulse">😶</div>
                    <div className="w-full h-0.5 bg-pink-500 animate-bounce" style={{ boxShadow:'0 0 12px #FF55C2' }} />
                    <p className="text-xs text-pink-400 mt-2">Scanning face…</p>
                  </div>
                ) : result==='face-matched' ? (
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">😊</div>
                    <p className="text-xs text-green-400 font-bold">✓ Face Matched!</p>
                  </div>
                ) : (
                  <div className="text-4xl opacity-40">🤖</div>
                )}
              </div>
              {/* Scan lines */}
              {result==='face-scanning' && [...Array(5)].map((_,i) => (
                <div key={i} className="absolute left-0 right-0 h-px bg-pink-500/30" style={{ top:`${20+i*15}%` }} />
              ))}
            </div>
            {result==='face-matched' && (
              <div className="mb-4 p-3 rounded-xl" style={{ background:'rgba(70,255,171,0.1)', border:'1px solid rgba(70,255,171,0.3)' }}>
                <p className="text-sm font-bold text-green-400">✓ Identity Confirmed — Welcome, Alex Johnson!</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">VIP · Neon Dreams Festival</p>
              </div>
            )}
            <button onClick={simulateFace} disabled={result==='face-scanning'}
              className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50"
              style={{ background:'linear-gradient(135deg,#DD1FFF,#24D8FB)' }}>
              {result==='face-scanning'?'Scanning…':'Start Face Recognition'}
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-3">⚠️ Facial recognition is simulated for demo purposes</p>
          </div>
        )}

        {/* Recent check-ins */}
        <div className="glass rounded-2xl p-5 border border-[var(--border)]">
          <h3 className="font-semibold text-sm text-[var(--text)] mb-3">Recent Check-ins</h3>
          <div className="space-y-2">
            {[['Marcus R.','#4ADE80','VIP · 2 min ago'],['Sofia K.','#F472B6','General · 5 min ago'],['James T.','#60A5FA','VIP · 8 min ago'],['Luna P.','#FACC15','Early Bird · 12 min ago']].map(([name,col,meta]) => (
              <div key={String(name)} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background:String(col) }}>
                  {(String(name)).split(' ').map((w:string)=>w[0]).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--text)]">{name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{meta}</p>
                </div>
                <span className="text-green-500 text-xs font-bold">✓</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
