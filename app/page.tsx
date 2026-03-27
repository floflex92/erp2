"use client";
import { useState } from "react";

// ─── Données mock ───────────────────────────────────────────
const MOCK = {
  kpis: {
    caJour:       { val: "12 480 €",  delta: "+8%",   up: true  },
    caMois:       { val: "187 340 €", delta: "+12%",  up: true  },
    coursesJour:  { val: "23",        delta: "-2",    up: false },
    impayés:      { val: "34 200 €",  delta: "+3",    up: false },
  },
  courses: [
    { id:"C-001", client:"Leroy SA",       from:"Lyon",      to:"Paris",     conducteur:"M. Petit",    statut:"EN_COURS",  heure:"06:30" },
    { id:"C-002", client:"BTP Rhône",      from:"Grenoble",  to:"Marseille", conducteur:"F. Durand",   statut:"PLANIFIEE", heure:"09:00" },
    { id:"C-003", client:"Agri-Sud",       from:"Valence",   to:"Nîmes",     conducteur:"J. Martin",   statut:"LIVREE",    heure:"04:00" },
    { id:"C-004", client:"Métal France",   from:"St-Étienne","to":"Bordeaux",conducteur:"P. Bernard",  statut:"EN_COURS",  heure:"07:15" },
    { id:"C-005", client:"Distrib Ouest",  from:"Bourg",     to:"Nantes",    conducteur:"A. Simon",    statut:"LITIGE",    heure:"05:45" },
    { id:"C-006", client:"LogiPro",        from:"Chambéry",  to:"Toulouse",  conducteur:"C. Moreau",   statut:"PLANIFIEE", heure:"11:00" },
  ],
  alertes: [
    { id:1, type:"EXCES_VITESSE",         conducteur:"M. Petit",   camion:"AA-123-BB", val:"112 km/h", temps:"08:42", grave:true  },
    { id:2, type:"PAUSE_MANQUANTE",       conducteur:"P. Bernard", camion:"CC-456-DD", val:"4h30 sans pause", temps:"09:15", grave:true  },
    { id:3, type:"COUPURE_MOTEUR",        conducteur:"F. Durand",  camion:"EE-789-FF", val:"—",        temps:"07:55", grave:false },
    { id:4, type:"TEMPS_CONDUITE_DEPASSE",conducteur:"A. Simon",   camion:"GG-012-HH", val:"9h12",    temps:"06:30", grave:true  },
    { id:5, type:"FREINAGE_BRUSQUE",      conducteur:"J. Martin",  camion:"II-345-JJ", val:"—",        temps:"05:10", grave:false },
  ],
  camions: [
    { id:"AA-123-BB", lat:48.8, lng:2.3,   conducteur:"M. Petit",   course:"C-001", vitesse:87,  statut:"EN_COURS"  },
    { id:"CC-456-DD", lat:45.7, lng:4.8,   conducteur:"F. Durand",  course:"C-002", vitesse:0,   statut:"ARRET"     },
    { id:"EE-789-FF", lat:44.8, lng:0.6,   conducteur:"P. Bernard", course:"C-004", vitesse:92,  statut:"EN_COURS"  },
    { id:"GG-012-HH", lat:47.2, lng:-1.5,  conducteur:"A. Simon",   course:"C-005", vitesse:78,  statut:"EN_COURS"  },
    { id:"II-345-JJ", lat:43.3, lng:3.2,   conducteur:"J. Martin",  course:"C-003", vitesse:0,   statut:"TERMINE"   },
  ],
};

const STATUT_META = {
  EN_COURS:  { label:"En cours",  bg:"#1a3a2a", color:"#4ade80", dot:"#22c55e" },
  PLANIFIEE: { label:"Planifiée", bg:"#1a2535", color:"#60a5fa", dot:"#3b82f6" },
  LIVREE:    { label:"Livrée",    bg:"#1a2a1a", color:"#86efac", dot:"#16a34a" },
  LITIGE:    { label:"Litige",    bg:"#3a1a1a", color:"#fca5a5", dot:"#ef4444" },
  ANNULEE:   { label:"Annulée",   bg:"#2a2a2a", color:"#9ca3af", dot:"#6b7280" },
};

const ALERTE_META = {
  EXCES_VITESSE:         "Excès de vitesse",
  PAUSE_MANQUANTE:       "Pause manquante",
  COUPURE_MOTEUR:        "Coupure moteur",
  TEMPS_CONDUITE_DEPASSE:"Temps conduite dépassé",
  FREINAGE_BRUSQUE:      "Freinage brusque",
};

// ─── Composants ────────────────────────────────────────────

function KpiCard({ label, val, delta, up }) {
  return (
    <div style={{
      background:"#0f1923", border:"1px solid #1e2d3d",
      borderRadius:12, padding:"20px 24px",
      display:"flex", flexDirection:"column", gap:8,
    }}>
      <span style={{ fontSize:11, fontFamily:"'DM Mono',monospace", letterSpacing:"0.12em", color:"#4a6580", textTransform:"uppercase" }}>{label}</span>
      <span style={{ fontSize:28, fontWeight:700, color:"#e8f0f8", fontFamily:"'Space Grotesk',sans-serif", letterSpacing:"-0.02em" }}>{val}</span>
      <span style={{ fontSize:12, color: up ? "#4ade80" : "#f87171", fontFamily:"'DM Mono',monospace" }}>
        {up ? "▲" : "▼"} {delta} vs hier
      </span>
    </div>
  );
}

function StatutBadge({ statut }) {
  const m = STATUT_META[statut] || STATUT_META.ANNULEE;
  return (
    <span style={{
      background: m.bg, color: m.color,
      borderRadius: 6, padding:"3px 10px", fontSize:11,
      fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em",
      display:"inline-flex", alignItems:"center", gap:5,
    }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background: m.dot, display:"inline-block" }}/>
      {m.label}
    </span>
  );
}

function CoursesTable() {
  return (
    <div style={{ background:"#0f1923", border:"1px solid #1e2d3d", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e2d3d", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:600, color:"#e8f0f8", fontSize:14 }}>Courses du jour</span>
        <span style={{ fontSize:11, color:"#4a6580", fontFamily:"'DM Mono',monospace" }}>{MOCK.courses.length} courses</span>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:"#0a1018" }}>
            {["Réf","Client","Trajet","Conducteur","Départ","Statut"].map(h => (
              <th key={h} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, color:"#4a6580", fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", fontWeight:400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK.courses.map((c, i) => (
            <tr key={c.id} style={{ borderTop:"1px solid #131e28", background: i%2===0 ? "transparent" : "#0b1520", cursor:"pointer", transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background="#142030"}
              onMouseLeave={e => e.currentTarget.style.background= i%2===0 ? "transparent" : "#0b1520"}
            >
              <td style={{ padding:"12px 16px", fontSize:12, color:"#60a5fa", fontFamily:"'DM Mono',monospace" }}>{c.id}</td>
              <td style={{ padding:"12px 16px", fontSize:13, color:"#c8d8e8", fontWeight:500 }}>{c.client}</td>
              <td style={{ padding:"12px 16px", fontSize:12, color:"#7a9ab8" }}>{c.from} → {c.to}</td>
              <td style={{ padding:"12px 16px", fontSize:12, color:"#7a9ab8" }}>{c.conducteur}</td>
              <td style={{ padding:"12px 16px", fontSize:12, color:"#4a6580", fontFamily:"'DM Mono',monospace" }}>{c.heure}</td>
              <td style={{ padding:"12px 16px" }}><StatutBadge statut={c.statut}/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertesPanel() {
  const [dismissed, setDismissed] = useState([]);
  const visible = MOCK.alertes.filter(a => !dismissed.includes(a.id));
  return (
    <div style={{ background:"#0f1923", border:"1px solid #1e2d3d", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e2d3d", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:600, color:"#e8f0f8", fontSize:14 }}>Alertes conducteurs</span>
        {visible.filter(a=>a.grave).length > 0 && (
          <span style={{ background:"#3a0a0a", color:"#f87171", borderRadius:20, padding:"2px 10px", fontSize:11, fontFamily:"'DM Mono',monospace" }}>
            {visible.filter(a=>a.grave).length} critiques
          </span>
        )}
      </div>
      <div style={{ maxHeight:320, overflowY:"auto" }}>
        {visible.length === 0 && (
          <div style={{ padding:32, textAlign:"center", color:"#2a4a6a", fontSize:13 }}>Aucune alerte active</div>
        )}
        {visible.map(a => (
          <div key={a.id} style={{
            padding:"14px 20px", borderBottom:"1px solid #131e28",
            display:"flex", alignItems:"center", gap:14,
            background: a.grave ? "#1a0e0e" : "transparent",
            transition:"background .15s",
          }}>
            <div style={{
              width:8, height:8, borderRadius:"50%", flexShrink:0,
              background: a.grave ? "#ef4444" : "#f59e0b",
              boxShadow: a.grave ? "0 0 6px #ef444488" : "none",
            }}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:500, color: a.grave ? "#fca5a5" : "#fcd34d" }}>
                {ALERTE_META[a.type]}
              </div>
              <div style={{ fontSize:11, color:"#4a6580", marginTop:2, fontFamily:"'DM Mono',monospace" }}>
                {a.conducteur} · {a.camion} {a.val ? `· ${a.val}` : ""}
              </div>
            </div>
            <span style={{ fontSize:11, color:"#2a4a6a", fontFamily:"'DM Mono',monospace", flexShrink:0 }}>{a.temps}</span>
            <button onClick={() => setDismissed(d => [...d, a.id])} style={{
              background:"transparent", border:"1px solid #1e2d3d", color:"#4a6580",
              borderRadius:6, padding:"3px 8px", fontSize:11, cursor:"pointer",
              flexShrink:0, fontFamily:"'DM Mono',monospace",
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarteGps() {
  const [selected, setSelected] = useState(null);
  // Carte SVG schématique France simplifiée
  // Coordonnées normalisées dans viewBox 0 0 300 340
  const toX = lng => (lng + 5) / 15 * 280 + 10;
  const toY = lat => (51.5 - lat) / 11 * 300 + 20;

  return (
    <div style={{ background:"#0f1923", border:"1px solid #1e2d3d", borderRadius:12, overflow:"hidden" }}>
      <div style={{ padding:"16px 20px", borderBottom:"1px solid #1e2d3d", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:600, color:"#e8f0f8", fontSize:14 }}>Carte GPS temps réel</span>
        <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#4ade80", fontFamily:"'DM Mono',monospace" }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", display:"inline-block", animation:"pulse 2s infinite" }}/>
          LIVE
        </span>
      </div>
      <div style={{ display:"flex", gap:0 }}>
        {/* Carte */}
        <div style={{ flex:1, background:"#080f18", position:"relative" }}>
          <svg width="100%" viewBox="0 0 300 340" style={{ display:"block" }}>
            {/* Fond mer */}
            <rect x="0" y="0" width="300" height="340" fill="#080f18"/>
            {/* Contour France simplifié */}
            <path d="M80,20 L140,15 L190,25 L230,60 L260,100 L270,150 L250,200 L240,240 L200,280 L160,310 L120,300 L80,270 L50,230 L30,180 L40,130 L60,80 Z"
              fill="#0d1e2e" stroke="#1e3a5a" strokeWidth="1.5" opacity="0.8"/>
            {/* Grille légère */}
            {[1,2,3,4].map(i => (
              <line key={i} x1={i*60} y1="0" x2={i*60} y2="340" stroke="#0e1e2e" strokeWidth="0.5"/>
            ))}
            {[1,2,3,4,5].map(i => (
              <line key={i} x1="0" y1={i*68} x2="300" y2={i*68} stroke="#0e1e2e" strokeWidth="0.5"/>
            ))}
            {/* Camions */}
            {MOCK.camions.map(cam => {
              const x = toX(cam.lng);
              const y = toY(cam.lat);
              const isSel = selected === cam.id;
              const color = cam.statut === "EN_COURS" ? "#22c55e" : cam.statut === "ARRET" ? "#f59e0b" : "#6b7280";
              return (
                <g key={cam.id} style={{ cursor:"pointer" }} onClick={() => setSelected(isSel ? null : cam.id)}>
                  {isSel && <circle cx={x} cy={y} r="16" fill={color} opacity="0.12"/>}
                  <circle cx={x} cy={y} r="6" fill={color} opacity="0.2"/>
                  <circle cx={x} cy={y} r="4" fill={color} stroke="#080f18" strokeWidth="1.5"/>
                  {isSel && (
                    <g>
                      <rect x={x+10} y={y-20} width="100" height="36" rx="5" fill="#0d1e2e" stroke={color} strokeWidth="0.8"/>
                      <text x={x+15} y={y-7} fontSize="9" fill={color} fontFamily="'DM Mono',monospace">{cam.id}</text>
                      <text x={x+15} y={y+4} fontSize="8" fill="#7a9ab8" fontFamily="'DM Mono',monospace">{cam.conducteur}</text>
                      <text x={x+15} y={y+14} fontSize="8" fill="#4a6580" fontFamily="'DM Mono',monospace">{cam.vitesse} km/h · {cam.course}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        {/* Liste camions */}
        <div style={{ width:200, borderLeft:"1px solid #1e2d3d", overflow:"auto", maxHeight:340 }}>
          {MOCK.camions.map(cam => {
            const color = cam.statut === "EN_COURS" ? "#22c55e" : cam.statut === "ARRET" ? "#f59e0b" : "#6b7280";
            const isSel = selected === cam.id;
            return (
              <div key={cam.id}
                onClick={() => setSelected(isSel ? null : cam.id)}
                style={{
                  padding:"12px 14px", borderBottom:"1px solid #0e1a26", cursor:"pointer",
                  background: isSel ? "#0d1e2e" : "transparent", transition:"background .15s",
                }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:"#c8d8e8", fontFamily:"'DM Mono',monospace", fontWeight:600 }}>{cam.id}</span>
                </div>
                <div style={{ fontSize:11, color:"#4a6580", paddingLeft:12 }}>{cam.conducteur}</div>
                <div style={{ fontSize:10, color:"#2a4a6a", paddingLeft:12, fontFamily:"'DM Mono',monospace" }}>
                  {cam.vitesse > 0 ? `${cam.vitesse} km/h` : "À l'arrêt"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard principal ────────────────────────────────────
export default function Dashboard() {
  const [role, setRole] = useState("exploitant");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin:0; padding:0; }
        body { background:#070d14; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#0a1018; }
        ::-webkit-scrollbar-thumb { background:#1e3a5a; border-radius:4px; }
        @keyframes pulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.3; }
        }
      `}</style>

      <div style={{ minHeight:"100vh", background:"#070d14", fontFamily:"'Space Grotesk',sans-serif", color:"#e8f0f8" }}>

        {/* ── Header ── */}
        <header style={{
          padding:"0 28px", height:56, borderBottom:"1px solid #1e2d3d",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background:"#0a1018", position:"sticky", top:0, zIndex:10,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:28, height:28, background:"#1a4a8a", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:14 }}>🚛</span>
            </div>
            <span style={{ fontSize:15, fontWeight:700, letterSpacing:"-0.01em", color:"#e8f0f8" }}>TransportERP</span>
            <span style={{ width:1, height:18, background:"#1e2d3d", margin:"0 4px" }}/>
            <span style={{ fontSize:11, color:"#4a6580", fontFamily:"'DM Mono',monospace" }}>
              {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
            </span>
          </div>

          {/* Switcher rôle */}
          <div style={{ display:"flex", gap:4, background:"#0f1923", border:"1px solid #1e2d3d", borderRadius:8, padding:3 }}>
            {[["dirigeant","Dirigeant"],["exploitant","Exploitant"]].map(([r, label]) => (
              <button key={r} onClick={() => setRole(r)} style={{
                padding:"5px 14px", borderRadius:6, border:"none", cursor:"pointer",
                fontSize:12, fontFamily:"'Space Grotesk',sans-serif", fontWeight:500,
                background: role===r ? "#1a4a8a" : "transparent",
                color: role===r ? "#60a5fa" : "#4a6580",
                transition:"all .2s",
              }}>{label}</button>
            ))}
          </div>

          {/* Nav */}
          <nav style={{ display:"flex", gap:4 }}>
            {["Dashboard","Courses","Flotte","Conducteurs","Facturation"].map(n => (
              <button key={n} style={{
                background: n==="Dashboard" ? "#1e2d3d" : "transparent",
                border:"none", color: n==="Dashboard" ? "#e8f0f8" : "#4a6580",
                padding:"6px 12px", borderRadius:6, fontSize:12, cursor:"pointer",
                fontFamily:"'Space Grotesk',sans-serif",
              }}>{n}</button>
            ))}
          </nav>
        </header>

        {/* ── Contenu ── */}
        <main style={{ padding:"24px 28px", maxWidth:1400, margin:"0 auto" }}>

          {/* Titre + contexte */}
          <div style={{ marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#e8f0f8", letterSpacing:"-0.02em" }}>
                {role === "dirigeant" ? "Vue direction" : "Tableau de bord exploitation"}
              </h1>
              <p style={{ fontSize:12, color:"#4a6580", marginTop:4, fontFamily:"'DM Mono',monospace" }}>
                {role === "dirigeant" ? "Performance globale · Finances · Flotte" : "Dispatch du jour · GPS · Alertes en temps réel"}
              </p>
            </div>
            <button style={{
              background:"#1a4a8a", color:"#93c5fd", border:"none",
              borderRadius:8, padding:"8px 16px", fontSize:12, cursor:"pointer",
              fontFamily:"'Space Grotesk',sans-serif", fontWeight:500,
            }}>
              + Nouvelle course
            </button>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
            <KpiCard label="CA aujourd'hui"   {...MOCK.kpis.caJour}      />
            <KpiCard label="CA du mois"        {...MOCK.kpis.caMois}      />
            <KpiCard label="Courses du jour"   {...MOCK.kpis.coursesJour} />
            <KpiCard label="Impayés en cours"  {...MOCK.kpis.impayés}     />
          </div>

          {/* Ligne principale */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:14, marginBottom:14 }}>
            <CoursesTable/>
            <AlertesPanel/>
          </div>

          {/* Carte GPS */}
          <CarteGps/>

          {/* Vue dirigeant : indicateurs supplémentaires */}
          {role === "dirigeant" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginTop:14 }}>
              {[
                { label:"Taux de remplissage flotte", val:"78%",  sub:"18 / 23 véhicules actifs" },
                { label:"Km parcourus ce mois",       val:"41 280 km", sub:"+6% vs mois dernier" },
                { label:"Factures en attente",        val:"12",   sub:"34 200 € à encaisser" },
              ].map(c => (
                <div key={c.label} style={{
                  background:"#0f1923", border:"1px solid #1e2d3d", borderRadius:12,
                  padding:"20px 24px",
                }}>
                  <div style={{ fontSize:11, fontFamily:"'DM Mono',monospace", color:"#4a6580", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{c.label}</div>
                  <div style={{ fontSize:26, fontWeight:700, color:"#e8f0f8", letterSpacing:"-0.02em" }}>{c.val}</div>
                  <div style={{ fontSize:11, color:"#2a4a6a", marginTop:6, fontFamily:"'DM Mono',monospace" }}>{c.sub}</div>
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </>
  );
}