// ui.jsx — shared PointDrop UI primitives + icon set
const { useState, useEffect, useRef } = React;

// ─────────────────────────────────────────────────────────────
// Icons — simple stroke line icons (UI affordances)
// ─────────────────────────────────────────────────────────────
const ICONS = {
  library: 'M4 7h16M4 12h16M4 17h10',                 // stacked lines (overridden below)
  play:    'M8 5.5v13l11-6.5-11-6.5z',
  history: 'M12 12.5V6.4M12 12.5l3.3 1.5',                // clock hands only (no dial)
  settings:'M4 7h10M18 7h2M4 12h2M10 12h10M4 17h7M15 17h5',
  plus:    'M12 6v12M6 12h12',
  minus:   'M6 12h12',
  back:    'M15 5l-7 7 7 7',
  chevR:   'M9 5l7 7-7 7',
  mic:     'M12 4a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V7a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v3',
  wifi:    'M3 9.5a13 13 0 0 1 18 0M6.5 13a8 8 0 0 1 11 0M10 16.5a3 3 0 0 1 4 0M12 20h.01',
  check:   'M5 12.5l4.5 4.5L19 7',
  close:   'M6 6l12 12M18 6L6 18',
  trophy:  'M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 0-3 3M9 18h6M10 14v4M14 14v4',
  trash:   'M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13',
  download:'M12 4v10m0 0l-4-4m4 4l4-4M5 19h14',
  shield:  'M12 4l7 2.5V12c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6.5L12 4z',
  dots:    'M12 6h.01M12 12h.01M12 18h.01',
  edit:    'M4 20l4-1 10-10-3-3L5 16l-1 4zM14 6l3 3',
  lan:     'M12 4v5M5 20v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 20h2M11 20h2M17 20h2M9 9h6v3H9z',
  reset:   'M5 12a7 7 0 1 1 2 5M5 17v-4h4',
  grid:    'M5 5h5v5H5zM14 5h5v5h-5zM5 14h5v5H5zM14 14h5v5h-5z',
};

function Icon({ name, size = 22, color = 'currentColor', sw = 2, fill = false }) {
  const d = ICONS[name] || '';
  // library uses three rounded bars of different widths
  if (name === 'library') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5.5" width="16" height="4" rx="1.4" stroke={color} strokeWidth={sw}/>
        <rect x="4" y="13" width="16" height="5.5" rx="1.4" stroke={color} strokeWidth={sw}/>
      </svg>
    );
  }
  // history = clock dial + hands
  if (name === 'history') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.4" />
        <path d="M12 7.6V12l3 1.7" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? color : 'none'}
      stroke={fill ? 'none' : color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Status pill — colored dot + label using state palette
// ─────────────────────────────────────────────────────────────
function StatusPill({ tone = 'success', label, pulse = false, onClick }) {
  const map = { success: C.success, connect: C.connect, warn: C.warn, error: C.error, idle: C.ink50 };
  const softMap = { success: C.successSoft, connect: C.connectSoft, warn: C.warnSoft, error: C.errorSoft, idle: C.ink06 };
  const col = map[tone], soft = softMap[tone];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px 5px 8px', borderRadius: 100, border: 'none',
      background: soft, color: col, cursor: onClick ? 'pointer' : 'default',
      font: `700 12px/1 ${FONT_BODY}`, letterSpacing: 0.2, whiteSpace: 'nowrap',
    }}>
      <span style={{ position: 'relative', width: 8, height: 8 }}>
        <span style={{ position:'absolute', inset:0, borderRadius:'50%', background: col }}/>
        {pulse && <span className="pd-ping" style={{ position:'absolute', inset:0, borderRadius:'50%', background: col }}/>}
      </span>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Header — back chevron, title (Roboto Slab), optional right slot
// ─────────────────────────────────────────────────────────────
function Header({ title, onBack, right, sub }) {
  return (
    <div style={{ padding: '8px 18px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      {onBack && (
        <button onClick={onBack} className="pd-tap" style={{
          width: 38, height: 38, marginLeft: -8, borderRadius: 12, border: 'none',
          background: 'transparent', color: C.ink, display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}>
          <Icon name="back" size={24} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `800 23px/1.1 ${FONT_HEAD}`, color: C.ink, letterSpacing: -0.3 }}>{title}</div>
        {sub && <div style={{ font: `400 13px/1.3 ${FONT_BODY}`, color: C.ink50, marginTop: 3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
function Card({ children, onClick, style, pad = 16, active = false }) {
  return (
    <div onClick={onClick} className={onClick ? 'pd-card-tap' : ''} style={{
      background: C.surface, borderRadius: 18, padding: pad,
      boxShadow: SHADOW.card, border: `1px solid ${active ? C.primary : C.line}`,
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Buttons
// ─────────────────────────────────────────────────────────────
function Button({ children, onClick, tone = 'primary', full = false, size = 'md', disabled = false, icon }) {
  const pads = { sm: '9px 14px', md: '14px 18px', lg: '17px 20px' };
  const fs = { sm: 14, md: 16, lg: 17 };
  const tones = {
    primary: { background: disabled ? C.ink12 : C.primary, color: disabled ? C.ink35 : '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: C.ink, border: `1.5px solid ${C.ink12}` },
    soft:    { background: C.primarySoft, color: C.primary, border: 'none' },
    danger:  { background: C.errorSoft, color: C.error, border: 'none' },
  };
  return (
    <button onClick={disabled ? undefined : onClick} className={disabled ? '' : 'pd-btn'} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      width: full ? '100%' : 'auto', padding: pads[size], borderRadius: 14, whiteSpace: 'nowrap',
      font: `700 ${fs[size]}px/1 ${FONT_BODY}`, letterSpacing: 0.2,
      cursor: disabled ? 'default' : 'pointer', ...tones[tone],
    }}>
      {icon && <Icon name={icon} size={size === 'sm' ? 17 : 19} />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Segmented control
// ─────────────────────────────────────────────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: C.bgSunk, borderRadius: 14 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            flex: 1, padding: '10px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: on ? C.surface : 'transparent',
            color: on ? C.ink : C.ink50, boxShadow: on ? SHADOW.card : 'none',
            font: `700 13.5px/1.1 ${FONT_BODY}`,
          }}>{o.label}</button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom sheet
// ─────────────────────────────────────────────────────────────
function Sheet({ open, onClose, children, height = 'auto' }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  if (!mounted) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} className={open ? 'pd-fade-in' : 'pd-fade-out'} onAnimationEnd={() => { if (!open) setMounted(false); }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(28,22,18,0.32)' }} />
      <div className={open ? 'pd-sheet-in' : 'pd-sheet-out'} style={{
        position: 'relative', background: C.surface, borderRadius: '24px 24px 0 0',
        boxShadow: SHADOW.sheet, padding: '10px 18px 22px', height, maxHeight: '88%', overflow: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.ink12, margin: '4px auto 14px' }} />
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Centered modal dialog (for create flows — “in the middle”)
// ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, children, maxH = '88%' }) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => { if (open) setMounted(true); }, [open]);
  if (!mounted) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onClose} className={open ? 'pd-fade-in' : 'pd-fade-out'} onAnimationEnd={() => { if (!open) setMounted(false); }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,12,0.46)' }} />
      <div className={open ? 'pd-modal-in' : 'pd-modal-out'} style={{
        position: 'relative', width: '100%', background: C.surface, borderRadius: 22,
        boxShadow: SHADOW.modal, border: `1px solid ${C.gold}`, maxHeight: maxH,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// Ornamental divider — brass diamond between rule sections (tabletop feel)
function Ornament({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '2px 0' }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.ink12})` }} />
      {label
        ? <div style={{ font:`800 10px/1 ${FONT_BODY}`, letterSpacing: 1.6, textTransform:'uppercase', color: C.gold, whiteSpace:'nowrap', flexShrink:0 }}>{label}</div>
        : <div style={{ width: 6, height: 6, transform: 'rotate(45deg)', background: C.gold }} />}
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.ink12}, transparent)` }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toast layer (driven by app)
// ─────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const tones = { primary: C.ink, success: C.success, error: C.error, connect: C.connect, warn: C.warn };
  return (
    <div key={toast.key} className="pd-toast" style={{
      position: 'absolute', left: 16, right: 16, bottom: 92, zIndex: 60,
      background: tones[toast.tone] || C.ink, color: '#fff', borderRadius: 14,
      padding: '13px 16px', boxShadow: SHADOW.lift, display: 'flex', alignItems: 'center', gap: 11,
      font: `700 14px/1.3 ${FONT_BODY}`,
    }}>
      {toast.icon && <span style={{ display:'grid', placeItems:'center', flexShrink:0 }}><Icon name={toast.icon} size={19} /></span>}
      <span>{toast.msg}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar
// ─────────────────────────────────────────────────────────────
function TabBar({ tab, onTab }) {
  const tabs = [
    { id: 'library', label: 'Library', icon: 'library' },
    { id: 'play',    label: 'Play',    icon: 'play' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings',label: 'Settings',icon: 'settings' },
  ];
  return (
    <div style={{
      display: 'flex', background: C.surface, borderTop: `1px solid ${C.line}`,
      padding: '8px 8px 6px',
    }}>
      {tabs.map(t => {
        const on = t.id === tab;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 0',
          }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 56, height: 30, borderRadius: 100,
              background: on ? C.primarySoft : 'transparent', transition: 'background .2s',
            }}>
              <Icon name={t.icon} size={22} color={on ? C.primary : C.ink50} fill={t.id === 'play' && on} sw={2}/>
            </span>
            <span style={{ font: `${on ? 800 : 600} 11px/1 ${FONT_BODY}`, color: on ? C.primary : C.ink50 }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty / section label helpers
// ─────────────────────────────────────────────────────────────
function SectionLabel({ children, right }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', margin: '4px 2px 10px' }}>
      <div style={{ font: `800 11.5px/1 ${FONT_BODY}`, letterSpacing: 1.4, textTransform: 'uppercase', color: C.ink50, whiteSpace: 'nowrap' }}>{children}</div>
      {right}
    </div>
  );
}

Object.assign(window, {
  Icon, StatusPill, Header, Card, Button, Segmented, Sheet, Modal, Ornament, Toast, TabBar, SectionLabel,
});
