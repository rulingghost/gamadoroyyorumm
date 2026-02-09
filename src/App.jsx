import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, X, HelpCircle, Download, Trash2, LayoutGrid, Cloud, CloudOff, Loader2, LogOut, User, Lock, RefreshCw } from 'lucide-react';
import { db, ref, onValue, update, set } from './firebase';
import { residents } from './residents';
import './index.css';

const BLOCKS = {
  A: 86,
  B: 94
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('gamador_auth') === 'true');
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [activeBlock, setActiveBlock] = useState(() => localStorage.getItem('gamador_active_block') || 'A');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginCreds.username === 'admin' && loginCreds.password === 'admin') {
      setIsAuthenticated(true);
      localStorage.setItem('gamador_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Kullanıcı adı veya şifre hatalı!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('gamador_auth');
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    const dataRef = ref(db, 'daireler');
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
      } else {
        const initial = {};
        Object.entries(BLOCKS).forEach(([block, count]) => {
          for (let i = 1; i <= count; i++) {
            const id = `${block}${i}`;
            initial[id] = {
              status: 'uncertain',
              note: '',
              name: residents[id] || '',
              updatedAt: Date.now()
            };
          }
        });
        set(dataRef, initial);
        setData(initial);
      }
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firebase Hatası:", err);
      setError("Bağlantı hatası!");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const syncNames = async () => {
    if (window.confirm('Excel dosyasındaki isimleri veritabanına aktarmak istiyor musunuz? Mevcut isimler güncellenecektir.')) {
      setIsSyncing(true);
      const updates = {};
      Object.keys(data).forEach(id => {
        if (residents[id]) {
          updates[`daireler/${id}/name`] = residents[id];
        }
      });
      await update(ref(db), updates);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('gamador_active_block', activeBlock);
  }, [activeBlock]);

  const updateStatus = async (id, status) => {
    setIsSyncing(true);
    try {
      await update(ref(db, `daireler/${id}`), {
        status,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Güncelleme hatası:", err);
    }
    setIsSyncing(false);
  };

  const updateNote = async (id, note) => {
    setIsSyncing(true);
    try {
      await update(ref(db, `daireler/${id}`), {
        note,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Not hatası:", err);
    }
    setIsSyncing(false);
  };

  const clearData = async () => {
    if (window.confirm('Veritabanını sıfırlamak istediğinize emin misiniz?')) {
      setIsSyncing(true);
      const initial = {};
      Object.entries(BLOCKS).forEach(([block, count]) => {
        for (let i = 1; i <= count; i++) {
          const id = `${block}${i}`;
          initial[id] = { status: 'uncertain', note: '', name: residents[id] || '', updatedAt: Date.now() };
        }
      });
      await set(ref(db, 'daireler'), initial);
      setIsSyncing(false);
    }
  };

  const stats = useMemo(() => {
    const blockIds = Object.keys(data).filter(id => id.startsWith(activeBlock));
    const s = { yes: 0, no: 0, uncertain: 0, total: blockIds.length };
    blockIds.forEach(id => {
      const item = data[id] || { status: 'uncertain' };
      s[item.status]++;
    });
    s.percent = s.total > 0 ? Math.round(((s.yes + s.no) / s.total) * 100) : 0;
    return s;
  }, [data, activeBlock]);

  const filteredDoors = useMemo(() => {
    return Object.keys(data)
      .filter(id => id.startsWith(activeBlock))
      .filter(id => {
        const item = data[id];
        const searchStr = search.toLowerCase();
        const matchesSearch = id.toLowerCase().includes(searchStr) || 
                             (item.note && item.note.toLowerCase().includes(searchStr)) ||
                             (item.name && item.name.toLowerCase().includes(searchStr));
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const numA = parseInt(a.substring(1));
        const numB = parseInt(b.substring(1));
        return numA - numB;
      });
  }, [data, activeBlock, search, statusFilter]);

  if (!isAuthenticated) {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <h2>GAMADOR</h2>
          <p>Yönetim Takip Sistemine Giriş Yapın</p>
          
          {loginError && <div className="login-error">{loginError}</div>}
          
          <div className="input-group">
            <label><User size={14} style={{verticalAlign: 'middle', marginRight: 5}} /> Kullanıcı Adı</label>
            <input 
              type="text" 
              value={loginCreds.username} 
              onChange={e => setLoginCreds({...loginCreds, username: e.target.value})} 
              placeholder="Kullanıcı adı"
              required
            />
          </div>
          
          <div className="input-group">
            <label><Lock size={14} style={{verticalAlign: 'middle', marginRight: 5}} /> Şifre</label>
            <input 
              type="password" 
              value={loginCreds.password} 
              onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} 
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="login-btn">Giriş Yap</button>
        </form>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', color: 'white'}}>
        <Loader2 size={48} className="animate-spin" style={{color: 'var(--accent-yellow)', marginBottom: '1rem'}} />
        <p>Veriler güvenli şekilde yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="sticky-header">
        <div className="container">
          <div className="header-top">
            <div style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <h1 style={{margin: 0, cursor: 'pointer'}} onClick={() => window.location.reload()}>GAMADOR</h1>
                {isSyncing ? (
                  <span style={{color: 'var(--accent-yellow)', fontSize: '0.7rem', display: 'flex', alignItems: 'center'}}>
                    <Loader2 size={12} className="animate-spin" style={{marginRight: 4}} /> Eşitleniyor...
                  </span>
                ) : (
                  <span style={{color: 'var(--accent-green)', fontSize: '0.7rem', display: 'flex', alignItems: 'center'}}>
                    <Cloud size={12} style={{marginRight: 4}} /> Bulut Canlı
                  </span>
                )}
              </div>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <div className="block-tabs">
                <button className={`block-tab ${activeBlock === 'A' ? 'active' : ''}`} onClick={() => setActiveBlock('A')}>A BLOK</button>
                <button className={`block-tab ${activeBlock === 'B' ? 'active' : ''}`} onClick={() => setActiveBlock('B')}>B BLOK</button>
              </div>
              <button onClick={handleLogout} className="logout-btn" title="Çıkış Yap">
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-item"><span className="stat-val">{stats.total}</span><span className="stat-lbl">DAİRE</span></div>
            <div className="stat-item" style={{borderColor: 'var(--accent-green)'}}><span className="stat-val" style={{color: 'var(--accent-green)'}}>{stats.yes}</span><span className="stat-lbl">EVET</span></div>
            <div className="stat-item" style={{borderColor: 'var(--accent-red)'}}><span className="stat-val" style={{color: 'var(--accent-red)'}}>{stats.no}</span><span className="stat-lbl">HAYIR</span></div>
            <div className="stat-item"><span className="stat-val">{stats.percent}%</span><span className="stat-lbl">KATILIM</span></div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar" style={{width: `${stats.percent}%`}}></div>
          </div>

          <div className="controls">
            <div className="search-wrap">
              <Search size={18} />
              <input placeholder="Daire no veya notlarda ara..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="filter-pills">
              <button className={`pill all ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>HEPSİ</button>
              <button className={`pill yes ${statusFilter === 'yes' ? 'active' : ''}`} onClick={() => setStatusFilter('yes')}>EVET</button>
              <button className={`pill no ${statusFilter === 'no' ? 'active' : ''}`} onClick={() => setStatusFilter('no')}>HAYIR</button>
              <button className={`pill uncertain ${statusFilter === 'uncertain' ? 'active' : ''}`} onClick={() => setStatusFilter('uncertain')}>BELİRSİZ</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{marginTop: '1rem'}}>
        <div className="door-grid">
          {filteredDoors.length > 0 ? filteredDoors.map(id => (
            <div key={id} className="card">
              <div className="card-head">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="door-tag" style={{marginBottom: 4}}>{id} <span>DAİRE</span></div>
                  <div style={{fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-yellow)'}}>{data[id].name || 'İsimsiz'}</div>
                </div>
                <div className={`status-indicator ${data[id].status}`}></div>
              </div>
              <div className="vote-btns">
                <button className={`vote-btn ${data[id].status === 'yes' ? 'active yes' : ''}`} onClick={() => updateStatus(id, 'yes')}><Check size={20} /> EVET</button>
                <button className={`vote-btn ${data[id].status === 'no' ? 'active no' : ''}`} onClick={() => updateStatus(id, 'no')}><X size={20} /> HAYIR</button>
                <button className={`vote-btn ${data[id].status === 'uncertain' ? 'active uncertain' : ''}`} onClick={() => updateStatus(id, 'uncertain')}><HelpCircle size={20} /> BELİRSİZ</button>
              </div>
              <div className="note-wrap">
                <textarea className="note-input" placeholder="Görüşme notunu buraya yazın..." value={data[id].note} onChange={e => updateNote(id, e.target.value)} />
              </div>
              <div className="card-meta">
                <span>Son Güncelleme: {new Date(data[id].updatedAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}</span>
              </div>
            </div>
          )) : (
            <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-secondary)'}}>
              <LayoutGrid size={64} style={{marginBottom: '1.5rem', opacity: 0.1}} />
              <h3>Kayıt Bulunamadı</h3>
              <p>Arama kriterlerinize uygun daire bulunmuyor.</p>
            </div>
          )}
        </div>

        <div style={{marginTop: '5rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem', paddingBottom: '5rem', textAlign: 'center'}}>
          <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem'}}>Veri Yönetimi ve Güvenlik</p>
          <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap'}}>
            <button className="pill" onClick={syncNames}>
              <RefreshCw size={16} style={{marginRight: 8}} /> İsimleri Senkronize Et
            </button>
            <button className="pill" onClick={() => {
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `gamador_yedek_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
              }}
            >
              <Download size={16} style={{marginRight: 8}} /> Yedek İndir
            </button>
            <button className="pill" style={{color: 'var(--accent-red)'}} onClick={clearData}>
              <Trash2 size={16} style={{marginRight: 8}} /> Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
