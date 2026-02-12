import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, X, HelpCircle, Download, Trash2, LayoutGrid, Cloud, CloudOff, Loader2, LogOut, User, Lock, RefreshCw, Phone, PhoneCall } from 'lucide-react';
import { db, ref, onValue, update, set } from './firebase';
import { residents } from './residents';
import './index.css';

const BLOCKS = {
  A: 86,
  B: 94
};

// Yazım hatalarını tolere eden ve Türkçe karakterleri normalize eden yardımcı fonksiyonlar
const normalizeText = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
};

const isFuzzyMatch = (target, pattern) => {
  const t = normalizeText(target);
  const p = normalizeText(pattern);
  
  // 1. Tam veya kısmi eşleşme (Standart)
  if (t.includes(p)) return true;
  
  // 2. Çok kısa kelimeler için fuzzy yapma (gürültüyü önlemek için)
  if (p.length < 3) return false;

  // 3. Basit bir "1 harf hata" kontrolü (Levenshtein benzeri ama daha hızlı)
  // Pattern, hedef kelimenin içinde %80+ benzerlikle var mı?
  if (t.length < p.length) return false;

  // Kelime kelime bazlı kontrol (Isimler için)
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.length < p.length - 1) continue;
    
    let mistakes = 0;
    let i = 0, j = 0;
    
    // Basit bir karakter karşılaştırma
    const maxMistakes = Math.floor(p.length / 4) + 1; // 4 harfte 1 hataya izin ver
    
    if (Math.abs(word.length - p.length) <= maxMistakes) {
      // Çok basit bir mesafe kontrolü
      let matchCount = 0;
      for (let char of p) {
        if (word.includes(char)) matchCount++;
      }
      if (matchCount >= p.length - maxMistakes) return true;
    }
  }

  return false;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('gamador_auth') === 'true');
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [activeBlock, setActiveBlock] = useState(() => localStorage.getItem('gamador_active_block') || 'A');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [residencyFilter, setResidencyFilter] = useState('all');
  const [phoneFilter, setPhoneFilter] = useState('all');
  const [noteFilter, setNoteFilter] = useState('all');
  const [sortBy, setSortBy] = useState('door'); // 'door', 'recent'
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('gamador_collapsed');
    return saved !== null ? saved === 'true' : true;
  });
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('gamador_collapsed', newState);
  };

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
              residencyType: 'owner',
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

  const updateResidencyType = async (id, residencyType) => {
    setIsSyncing(true);
    try {
      await update(ref(db, `daireler/${id}`), {
        residencyType,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Residency type güncelleme hatası:", err);
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

  const updatePhone = async (id, phone) => {
    setIsSyncing(true);
    try {
      await update(ref(db, `daireler/${id}`), {
        phone,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error("Telefon hatası:", err);
    }
    setIsSyncing(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  const clearData = async () => {
    if (window.confirm('Veritabanını sıfırlamak istediğinize emin misiniz?')) {
      setIsSyncing(true);
      const initial = {};
      Object.entries(BLOCKS).forEach(([block, count]) => {
        for (let i = 1; i <= count; i++) {
          const id = `${block}${i}`;
          initial[id] = { 
            status: 'uncertain', 
            note: '', 
            name: residents[id] || '', 
            phone: '',
            residencyType: 'owner',
            updatedAt: Date.now() 
          };
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
      .filter(id => {
        const item = data[id];
        const searchStr = search.trim();
        const residentName = item.name || residents[id] || '';
        const note = item.note || '';
        const phone = item.phone || '';

        // 1. Blok Filtresi (Arama yoksa sadece aktif bloğu göster, arama varsa global ara)
        const matchesBlock = !searchStr ? id.startsWith(activeBlock) : true;
        
        // 2. Arama Filtresi (Eğer arama stringi varsa fuzzy eşleşme yap)
        const matchesSearch = !searchStr || (
          isFuzzyMatch(id, searchStr) || 
          isFuzzyMatch(residentName, searchStr) || 
          isFuzzyMatch(note, searchStr) || 
          phone.includes(searchStr)
        );

        // 3. Durum Filtresi (Evet, Hayır, Belirsiz)
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        
        // 4. Mülkiyet Filtresi (Ev Sahibi, Kiracı)
        let matchesResidency = true;
        if (residencyFilter === 'tenant') {
          matchesResidency = item.residencyType === 'tenant';
        } else if (residencyFilter === 'owner') {
          matchesResidency = item.residencyType === 'owner' || !item.residencyType;
        }

        // 5. Telefon Filtresi
        let matchesPhone = true;
        if (phoneFilter === 'has') {
          matchesPhone = !!item.phone;
        } else if (phoneFilter === 'none') {
          matchesPhone = !item.phone;
        }

        // 6. Not Filtresi
        let matchesNote = true;
        if (noteFilter === 'has') {
          matchesNote = !!item.note;
        } else if (noteFilter === 'none') {
          matchesNote = !item.note;
        }
        
        return matchesBlock && matchesSearch && matchesStatus && matchesResidency && matchesPhone && matchesNote;
      })
      .sort((a, b) => {
        if (sortBy === 'recent') {
          return (data[b].updatedAt || 0) - (data[a].updatedAt || 0);
        }
        
        const blockA = a[0];
        const blockB = b[0];
        if (blockA !== blockB) return blockA.localeCompare(blockB);
        
        const numA = parseInt(a.substring(1));
        const numB = parseInt(b.substring(1));
        return numA - numB;
      });
  }, [data, activeBlock, search, statusFilter, residencyFilter, phoneFilter, noteFilter, sortBy]);

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
                <h1 style={{margin: 0, cursor: 'pointer', fontSize: '1.4rem'}} onClick={() => window.location.reload()}>GAMADOR</h1>
                {isSyncing ? (
                  <span style={{color: 'var(--accent-yellow)', fontSize: '0.65rem', display: 'flex', alignItems: 'center'}}>
                    <Loader2 size={10} className="animate-spin" style={{marginRight: 4}} />
                  </span>
                ) : (
                  <span style={{color: 'var(--accent-green)', fontSize: '0.65rem', display: 'flex', alignItems: 'center'}}>
                    <Cloud size={10} style={{marginRight: 4}} />
                  </span>
                )}
              </div>
            </div>

            <div className="header-actions">
              <div className="search-wrap compact">
                <Search size={16} />
                <input placeholder="Hızlı ara..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              
              <button className={`expand-btn ${!isCollapsed ? 'active' : ''}`} onClick={toggleCollapse} title="İstatistik ve Filtreler">
                <LayoutGrid size={18} />
              </button>

              <div className="block-tabs compact">
                <button className={`block-tab ${activeBlock === 'A' ? 'active' : ''}`} onClick={() => setActiveBlock('A')}>A</button>
                <button className={`block-tab ${activeBlock === 'B' ? 'active' : ''}`} onClick={() => setActiveBlock('B')}>B</button>
              </div>

              <button onClick={handleLogout} className="logout-btn compact" title="Çıkış Yap">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <div className={`collapsible-content ${isCollapsed ? 'collapsed' : ''}`}>
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
              <div className="filter-group">
                <span className="filter-label">DURUM</span>
                <div className="filter-pills">
                  <button className={`pill all ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>HEPSİ</button>
                  <button className={`pill yes ${statusFilter === 'yes' ? 'active' : ''}`} onClick={() => setStatusFilter('yes')}>EVET</button>
                  <button className={`pill no ${statusFilter === 'no' ? 'active' : ''}`} onClick={() => setStatusFilter('no')}>HAYIR</button>
                  <button className={`pill uncertain ${statusFilter === 'uncertain' ? 'active' : ''}`} onClick={() => setStatusFilter('uncertain')}>BELİRSİZ</button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">MÜLKİYET</span>
                <div className="filter-pills">
                  <button className={`pill all ${residencyFilter === 'all' ? 'active' : ''}`} onClick={() => setResidencyFilter('all')}>HEPSİ</button>
                  <button className={`pill owner ${residencyFilter === 'owner' ? 'active' : ''}`} onClick={() => setResidencyFilter('owner')}>EV SAHİBİ</button>
                  <button className={`pill tenant ${residencyFilter === 'tenant' ? 'active' : ''}`} onClick={() => setResidencyFilter('tenant')}>KİRACI</button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">TELEFON</span>
                <div className="filter-pills">
                  <button className={`pill all ${phoneFilter === 'all' ? 'active' : ''}`} onClick={() => setPhoneFilter('all')}>HEPSİ</button>
                  <button className={`pill has ${phoneFilter === 'has' ? 'active' : ''}`} onClick={() => setPhoneFilter('has')}>VAR</button>
                  <button className={`pill none ${phoneFilter === 'none' ? 'active' : ''}`} onClick={() => setPhoneFilter('none')}>YOK</button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">NOT</span>
                <div className="filter-pills">
                  <button className={`pill all ${noteFilter === 'all' ? 'active' : ''}`} onClick={() => setNoteFilter('all')}>HEPSİ</button>
                  <button className={`pill has ${noteFilter === 'has' ? 'active' : ''}`} onClick={() => setNoteFilter('has')}>VAR</button>
                  <button className={`pill none ${noteFilter === 'none' ? 'active' : ''}`} onClick={() => setNoteFilter('none')}>YOK</button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">SIRALA</span>
                <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="door">Daire No</option>
                  <option value="recent">Son Güncelleme</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{marginTop: '1rem'}}>
        <div className="door-grid">
          {filteredDoors.length > 0 ? filteredDoors.map(id => (
            <div key={id} className={`card ${data[id].residencyType === 'tenant' ? 'is-tenant' : ''}`}>
              <div className="card-head">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                  <div className="door-tag" style={{marginBottom: 4}}>{id} <span>DAİRE</span></div>
                  <div style={{fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-yellow)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {data[id].name || residents[id] || 'İsimsiz'}
                    {data[id].note && <HelpCircle size={14} style={{color: 'var(--accent-yellow)', opacity: 0.7}} title="Not var" />}
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.4rem', alignItems: 'center'}}>
                  <button 
                    className="icon-action-btn" 
                    title="Kopyala" 
                    onClick={() => copyToClipboard(`${id} Daire - ${data[id].name || residents[id] || 'İsimsiz'} - Durum: ${data[id].status === 'yes' ? 'EVET' : data[id].status === 'no' ? 'HAYIR' : 'Belirsiz'} - Not: ${data[id].note || 'Yok'}`, id)}
                  >
                    {copySuccess === id ? <Check size={16} style={{color: 'var(--accent-green)'}} /> : <Download size={16} />}
                  </button>
                  <div className={`status-indicator ${data[id].status}`}></div>
                </div>
              </div>

              <div className="residency-toggle">
                <button 
                  className={`residency-btn ${data[id].residencyType !== 'tenant' ? 'active' : ''}`}
                  onClick={() => updateResidencyType(id, 'owner')}
                >
                  EV SAHİBİ
                </button>
                <button 
                  className={`residency-btn ${data[id].residencyType === 'tenant' ? 'active alert' : ''}`}
                  onClick={() => updateResidencyType(id, 'tenant')}
                >
                  KİRACI
                </button>
              </div>

              <div className="vote-btns">
                <button className={`vote-btn ${data[id].status === 'yes' ? 'active yes' : ''}`} onClick={() => updateStatus(id, 'yes')}><Check size={20} /> EVET</button>
                <button className={`vote-btn ${data[id].status === 'no' ? 'active no' : ''}`} onClick={() => updateStatus(id, 'no')}><X size={20} /> HAYIR</button>
                <button className={`vote-btn ${data[id].status === 'uncertain' ? 'active uncertain' : ''}`} onClick={() => updateStatus(id, 'uncertain')}><HelpCircle size={20} /> BELİRSİZ</button>
              </div>

              <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.8rem'}}>
                <div style={{position: 'relative', flex: 1}}>
                  <Phone size={14} style={{position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
                  <input 
                    type="tel" 
                    className="note-input" 
                    style={{minHeight: 'unset', padding: '0.6rem 0.8rem 0.6rem 2.2rem', fontSize: '0.85rem'}}
                    placeholder="Telefon No..." 
                    value={data[id].phone || ''} 
                    onChange={e => updatePhone(id, e.target.value)} 
                  />
                </div>
                {data[id].phone && (
                  <a 
                    href={`tel:${data[id].phone}`} 
                    className="vote-btn" 
                    style={{minHeight: 'unset', padding: '0.6rem 0.8rem', background: 'var(--accent-green)', color: 'white', border: 'none'}}
                  >
                    <PhoneCall size={16} />
                  </a>
                )}
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
