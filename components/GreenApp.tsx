"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import brandLogo from "@/images/igreenaisismall.jpg";
import type { ActivitySchedule, GoalAnswers, Impact, SafeUser } from "@/lib/types";

type View = "home" | "register" | "login" | "dashboard" | "admin-login" | "admin";
type AdminData = { createdAt: string; users: SafeUser[] };

const icons: Record<string, React.ReactNode> = {
  leaf: <><path d="M20 4c-7.5.2-13 3.6-13 9.2 0 3 2.1 5.1 5 5.1 5.5 0 7.8-6.6 8-14.3Z"/><path d="M4 21c2.8-5.6 6.7-9 12-11"/></>,
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  building: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 21v-4h6v4M7 7h2M15 7h2M7 11h2M15 11h2"/></>,
  globe: <><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  chart: <><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  lock: <><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
  spark: <path d="m12 3-1.4 4.6a4 4 0 0 1-2.7 2.7L3 12l4.9 1.7a4 4 0 0 1 2.7 2.7L12 21l1.4-4.6a4 4 0 0 1 2.7-2.7L21 12l-4.9-1.7a4 4 0 0 1-2.7-2.7L12 3Z"/>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3V1M21 12h2M12 21v2M3 12H1"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></>,
  pause: <><path d="M9 5v14M15 5v14"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  trash: <><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v5M14 11v5"/></>,
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>;
}

function Logo({ community = false }: { community?: boolean }) {
  return <Image src={brandLogo} alt="iGreen.ai logo" className={community ? "brand-logo community-logo" : "brand-logo"} sizes={community ? "72px" : "58px"} />;
}

const categoryInfo: Record<Impact["category"], { label: string; unit: string; color: string; suggestion: string }> = {
  transport: { label: "Low-carbon travel", unit: "km avoided", color: "#337d5b", suggestion: "Walked, cycled, carpooled or used transit" },
  energy: { label: "Clean energy", unit: "kWh saved", color: "#e5a32d", suggestion: "Reduced electricity or used renewables" },
  food: { label: "Planet-friendly food", unit: "plant-based meals", color: "#e0694f", suggestion: "Chose a plant-forward meal" },
  waste: { label: "Circular living", unit: "kg diverted", color: "#6b76bd", suggestion: "Reused, repaired, recycled or composted" },
  water: { label: "Water stewardship", unit: "liters saved", color: "#3b91a8", suggestion: "Reduced or reclaimed water" },
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

function levelFor(total: number) {
  if (total >= 500) return { name: "Planet Pioneer", next: 1000, number: 4 };
  if (total >= 150) return { name: "Impact Maker", next: 500, number: 3 };
  if (total >= 30) return { name: "Green Builder", next: 150, number: 2 };
  return { name: "Seed Starter", next: 30, number: 1 };
}

export default function GreenApp() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<SafeUser | null>(null);
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [menu, setMenu] = useState(false);
  const [communityCount, setCommunityCount] = useState<number | null>(null);

  function refreshCommunityCount() {
    api<{ members: number }>("/api/community", { cache: "no-store" })
      .then((data) => setCommunityCount(data.members))
      .catch(() => undefined);
  }

  useEffect(() => {
    refreshCommunityCount();
    api<{ authenticated: boolean; role?: string; user?: SafeUser }>("/api/auth/me")
      .then((data) => {
        if (data.role === "user" && data.user) { setUser(data.user); setView("dashboard"); }
        if (data.role === "admin") { setView("admin"); loadAdmin(); }
      })
      .finally(() => setLoading(false));
  }, []);

  async function loadAdmin() {
    try { setAdmin(await api<AdminData>("/api/admin/users")); } catch { setView("admin-login"); }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null); setAdmin(null); setView("home");
  }

  const go = (next: View) => { setView(next); setMenu(false); window.scrollTo({ top: 0, behavior: "smooth" }); };

  if (loading) return <div className="loader"><Logo /><p>Growing your space…</p></div>;

  return (
    <div className="app-shell">
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Main navigation">
          <button className="brand" onClick={() => go("home")} aria-label="igreen.ai home"><Logo /><span>igreen<span>.ai</span></span></button>
          <button className="menu-button" onClick={() => setMenu(!menu)} aria-label="Toggle menu"><Icon name="menu" /></button>
          <div className={`nav-links ${menu ? "open" : ""}`}>
            {view === "home" && <><a href="#mission" onClick={() => setMenu(false)}>Mission</a><a href="#pathways" onClick={() => setMenu(false)}>Take action</a><a href="#community" onClick={() => setMenu(false)}>Community</a></>}
            {user ? <><button className="text-button" onClick={() => go("dashboard")}>My impact</button><button className="button button-small button-dark" onClick={logout}><Icon name="logout" size={16} /> Sign out</button></>
              : view === "admin" ? <button className="button button-small button-dark" onClick={logout}><Icon name="logout" size={16} /> Sign out</button>
              : <><button className="text-button" onClick={() => go("login")}>Sign in</button><button className="button button-small button-primary" onClick={() => go("register")}>Join the movement <Icon name="arrow" size={16} /></button></>}
          </div>
        </nav>
      </header>

      {view === "home" && <Home onJoin={() => go("register")} onLogin={() => go("login")} communityCount={communityCount} />}
      {(view === "register" || view === "login" || view === "admin-login") && <AuthView mode={view} onDone={(nextUser, isAdmin) => { if (isAdmin) { go("admin"); loadAdmin(); } else { setUser(nextUser!); if (view === "register") refreshCommunityCount(); go("dashboard"); } }} onSwitch={go} />}
      {view === "dashboard" && user && <Dashboard user={user} setUser={setUser} />}
      {view === "admin" && <Admin data={admin} />}

      <footer className="footer">
        <div className="container footer-grid"><div><div className="brand footer-brand"><Logo /><span>igreen<span>.ai</span></span></div><p>Small actions. Shared progress.<br/>A future we grow together.</p></div><div><strong>Explore</strong><a href="#mission" onClick={() => go("home")}>Our mission</a><a href="#pathways" onClick={() => go("home")}>Ways to act</a></div><div><strong>Your space</strong><button onClick={() => go(user ? "dashboard" : "login")}>Member sign in</button><button onClick={() => go("admin-login")}>Admin access</button></div><div className="footer-note"><span>Built for Earth</span><small>© {new Date().getFullYear()} igreen.ai</small></div></div>
      </footer>
    </div>
  );
}

function Home({ onJoin, onLogin, communityCount }: { onJoin: () => void; onLogin: () => void; communityCount: number | null }) {
  return <main>
    <section className="hero">
      <div className="hero-blob blob-one"/><div className="hero-blob blob-two"/>
      <div className="container hero-grid">
        <div className="hero-copy"><div className="eyebrow"><span/> One planet. Billions of possibilities.</div><h1>Your everyday choices can <em>change the world.</em></h1><p>igreen.ai brings people and organizations together to turn simple sustainable actions into measurable, collective impact.</p><div className="hero-actions"><button className="button button-primary button-large" onClick={onJoin}>Start your impact journey <Icon name="arrow" /></button><a className="watch-link" href="#mission"><span className="play">▶</span> Discover our mission</a></div><div className="proof"><div className="avatars"><span>MJ</span><span>AK</span><span>SR</span><span>+</span></div><p><b>{communityCount === null ? "A growing global community" : communityCount === 0 ? "Be our first community member" : `${communityCount.toLocaleString()} ${communityCount === 1 ? "member" : "members"} strong`}</b><br/>choosing progress every day</p></div></div>
        <div className="planet-stage" aria-label="Illustration of a thriving planet and community">
          <div className="orbit orbit-one"><span/></div><div className="orbit orbit-two"><span/></div>
          <div className="planet"><div className="land land-one"/><div className="land land-two"/><div className="land land-three"/><div className="planet-shine"/></div>
          <div className="float-card card-impact"><span className="mini-icon"><Icon name="chart" /></span><div><b>+28%</b><small>collective impact</small></div></div>
          <div className="float-card card-community"><span className="pulse-dot"/><div><b>Community growing</b><small>one action at a time</small></div></div>
          <div className="leaf-sprig sprig-one">☘</div><div className="leaf-sprig sprig-two">❧</div>
        </div>
      </div><div className="scroll-cue">SCROLL TO EXPLORE <span>↓</span></div>
    </section>

    <section className="mission section" id="mission"><div className="container"><div className="section-heading centered"><span className="kicker">OUR NORTH STAR</span><h2>Make sustainability feel <em>possible.</em></h2><p>Not perfection. Not guilt. Just millions of people making better choices—and seeing those choices add up.</p></div><div className="mission-grid"><article className="mission-card coral"><span className="number">01</span><div className="mission-icon"><Icon name="spark" /></div><h3>Make it personal</h3><p>Discover practical actions shaped around your life, your resources, and what matters most to you.</p></article><article className="mission-card yellow"><span className="number">02</span><div className="mission-icon"><Icon name="chart" /></div><h3>Make it measurable</h3><p>Track the actions you take and translate everyday effort into a clear, portable impact record.</p></article><article className="mission-card green"><span className="number">03</span><div className="mission-icon"><Icon name="people" /></div><h3>Make it collective</h3><p>Join a generous community where individual progress becomes momentum for everyone.</p></article></div></div></section>

    <section className="pathways section" id="pathways"><div className="container"><div className="section-heading split"><div><span className="kicker">YOUR PATH, YOUR PACE</span><h2>There’s a way in<br/>for <em>everyone.</em></h2></div><p>Whether you’re changing one habit or an entire supply chain, your contribution belongs here.</p></div><div className="path-grid">
      <PathCard icon="people" label="FOR YOU" title="Live a little greener" text="Small shifts that fit real life—and make a real difference." items={["Choose lower-carbon journeys", "Waste less food and water", "Support responsible products"]} accent="mint" onJoin={onJoin}/>
      <PathCard icon="building" label="FOR BUSINESS" title="Grow with purpose" text="Put sustainability to work in your team, operations, and community." items={["Engage employees in shared goals", "Track everyday operational wins", "Tell a credible impact story"]} accent="sun" onJoin={onJoin}/>
      <PathCard icon="globe" label="FOR ENTERPRISE" title="Lead lasting change" text="Turn ambition into action across teams, partners, and places." items={["Mobilize a global workforce", "Create a culture of participation", "Connect local action to ESG goals"]} accent="coral" onJoin={onJoin}/>
    </div></div></section>

    <section className="examples section"><div className="container examples-grid"><div className="examples-art"><div className="sun-disc"/><div className="hills h1"/><div className="hills h2"/><div className="tree t1">♣</div><div className="tree t2">♣</div><div className="person p1">●</div><div className="person p2">●</div><div className="impact-chip">12.4 kg <small>CO₂e saved this week</small></div></div><div className="examples-copy"><span className="kicker">START WHERE YOU ARE</span><h2>Little choices.<br/><em>Visible progress.</em></h2><div className="example-list"><div><span>01</span><p><b>Swap one commute</b>Bike, walk, carpool, or take transit once this week.</p></div><div><span>02</span><p><b>Make one meal plant-first</b>A simple plate can make a surprisingly meaningful dent.</p></div><div><span>03</span><p><b>Give something a second life</b>Repair, share, donate, or choose pre-loved before buying new.</p></div></div><button className="button button-dark" onClick={onJoin}>Track your first action <Icon name="arrow" /></button></div></div></section>

    <section className="community section" id="community"><div className="container community-inner"><div className="community-orbit"><div className="community-core"><Logo community /><b>WE ACT<br/>TOGETHER</b></div>{["A","M","K","J","R","S"].map((x,i)=><span key={x} className={`member m${i+1}`}>{x}</span>)}</div><div className="community-copy"><span className="kicker light">BETTER TOGETHER</span><h2>A community that turns hope into <em>momentum.</em></h2><p>Share what works. Learn from someone across the world. Celebrate progress without comparing perfection.</p><blockquote>“I started with one car-free Friday. Now our whole studio joins in.”<cite>— Maya, community member</cite></blockquote><button className="button button-cream" onClick={onJoin}>Find your place here <Icon name="arrow" /></button></div></div></section>
    <section className="final-cta"><div className="container"><span className="kicker">YOUR NEXT STEP</span><h2>The future needs all of us.<br/><em>It starts with one.</em></h2><p>Create your free impact space, choose a first action, and see where it leads.</p><div><button className="button button-primary button-large" onClick={onJoin}>Join igreen.ai <Icon name="arrow" /></button><button className="button button-ghost button-large" onClick={onLogin}>I already have an account</button></div><small><Icon name="lock" size={14}/> Your activity is private by default. You choose what to share.</small></div></section>
  </main>;
}

function PathCard({ icon, label, title, text, items, accent, onJoin }: { icon: string; label: string; title: string; text: string; items: string[]; accent: string; onJoin: () => void }) {
  return <article className={`path-card ${accent}`}><div className="path-top"><span className="path-icon"><Icon name={icon} size={26}/></span><span className="kicker">{label}</span></div><h3>{title}</h3><p>{text}</p><ul>{items.map(item=><li key={item}><span><Icon name="check" size={14}/></span>{item}</li>)}</ul><button onClick={onJoin}>Explore your path <Icon name="arrow" size={18}/></button></article>;
}

function AuthView({ mode, onDone, onSwitch }: { mode: "register" | "login" | "admin-login"; onDone: (user: SafeUser | null, admin?: boolean) => void; onSwitch: (view: View) => void }) {
  const register = mode === "register"; const adminMode = mode === "admin-login";
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [type, setType] = useState("personal");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget); const body = Object.fromEntries(form.entries());
    try {
      if (register) {
        const data = await api<{ user: SafeUser }>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }); onDone(data.user);
      } else {
        const data = await api<{ role: string; user?: SafeUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier: body.identifier, password: body.password, adminMode }) }); onDone(data.user || null, data.role === "admin");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(false); }
  }
  return <main className="auth-page"><div className="auth-art"><div className="auth-orbit"/><div className="auth-planet"><Icon name={adminMode ? "lock" : "leaf"} size={62}/></div><p>{adminMode ? "Protected community stewardship" : "A greener future grows from what we do today."}</p></div><div className="auth-panel"><button className="back-button" onClick={() => onSwitch("home")}>← Back to home</button><div className="auth-card"><span className="kicker">{adminMode ? "SECURE ACCESS" : register ? "JOIN THE MOVEMENT" : "WELCOME BACK"}</span><h1>{adminMode ? "Administrator sign in" : register ? <>Create your <em>impact space.</em></> : <>Keep your momentum <em>growing.</em></>}</h1><p>{adminMode ? "Authorized administrators only." : register ? "Free to join. Private by default. Meaningful from day one." : "Sign in to track, reflect, and keep making a difference."}</p><form onSubmit={submit}>
    {register && <><div className="field-row"><label>Full name<input name="displayName" required minLength={2} autoComplete="name" placeholder="Your name"/></label><label>City or region <span>Optional</span><input name="city" autoComplete="address-level2" placeholder="Austin, TX"/></label></div><fieldset><legend>I’m joining as</legend><div className="type-picker">{[["personal","Personal","people"],["business","Business","building"],["corporate","Corporate","globe"]].map(([value,label,icon])=><label key={value} className={type===value ? "selected" : ""}><input type="radio" name="accountType" value={value} checked={type===value} onChange={()=>setType(value)}/><Icon name={icon}/><span>{label}</span></label>)}</div></fieldset>{type!=="personal" && <label>Organization <span>Optional</span><input name="organization" autoComplete="organization" placeholder="Organization name"/></label>}</>}
    <label>{adminMode ? "Username" : "Email address"}<input type={adminMode ? "text" : "email"} name={register ? "email" : "identifier"} required autoComplete={adminMode ? "username" : "email"} placeholder={adminMode ? "Admin username" : "you@example.com"}/></label><label>Password<input type="password" name="password" required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "At least 8 characters" : "Your password"}/></label>
    {error && <div className="form-error" role="alert">{error}</div>}<button className="button button-primary submit-button" disabled={busy}>{busy ? "One moment…" : adminMode ? "Open admin console" : register ? "Create my impact space" : "Sign in"}<Icon name="arrow"/></button>
  </form>{!adminMode && <div className="auth-switch">{register ? "Already part of the community?" : "New to igreen.ai?"} <button onClick={()=>onSwitch(register ? "login" : "register")}>{register ? "Sign in" : "Create an account"}</button></div>}<div className="privacy-note"><Icon name="lock" size={16}/><span>Your password is hashed and never displayed. Your profile is never exposed publicly.</span></div></div></div></main>;
}

function Dashboard({ user, setUser }: { user: SafeUser; setUser: (user: SafeUser) => void }) {
  const [showForm, setShowForm] = useState(false); const [showGoals, setShowGoals] = useState(false); const [showSchedule, setShowSchedule] = useState(false); const [showImport, setShowImport] = useState(false);
  const [category, setCategory] = useState<Impact["category"]>("transport"); const [scheduleCategory, setScheduleCategory] = useState<Impact["category"]>("transport"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [importResult, setImportResult] = useState<{inserted:number;duplicates:number;invalid:number}|null>(null);
  const total = useMemo(() => user.impacts.reduce((sum,item)=>sum+item.co2e,0), [user]);
  const level = levelFor(total); const progress = Math.min(100, total / level.next * 100);
  const byCategory = Object.keys(categoryInfo).map(key => ({ key: key as Impact["category"], value: user.impacts.filter(i=>i.category===key).reduce((s,i)=>s+i.co2e,0) }));
  async function add(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const body = Object.fromEntries(new FormData(event.currentTarget).entries()); try { const data=await api<{user:SafeUser}>("/api/impacts",{method:"POST",body:JSON.stringify(body)}); setUser(data.user); setShowForm(false); } catch(e){setError(e instanceof Error?e.message:"Unable to save.");} finally{setBusy(false);} }
  async function addSchedule(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const body=Object.fromEntries(new FormData(event.currentTarget).entries()); try { const data=await api<{user:SafeUser}>("/api/schedules",{method:"POST",body:JSON.stringify(body)}); setUser(data.user); setShowSchedule(false); } catch(e){setError(e instanceof Error?e.message:"Unable to create schedule.");} finally{setBusy(false);} }
  async function changeSchedule(schedule: ActivitySchedule, action: "toggle"|"delete") { setBusy(true); setError(""); try { const data=await api<{user:SafeUser}>("/api/schedules",{method:action==="delete"?"DELETE":"PATCH",body:JSON.stringify(action==="delete"?{id:schedule.id}:{id:schedule.id,active:!schedule.active})}); setUser(data.user); } catch(e){setError(e instanceof Error?e.message:"Unable to update schedule.");} finally{setBusy(false);} }
  async function uploadActivities(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); setImportResult(null); const form=new FormData(event.currentTarget); try { const response=await fetch("/api/import",{method:"POST",body:form}); const data=await response.json(); if(!response.ok) throw new Error(data.error||"Unable to upload workbook."); setUser(data.user); setImportResult({inserted:data.inserted,duplicates:data.duplicates,invalid:data.invalid}); } catch(e){setError(e instanceof Error?e.message:"Unable to upload workbook.");} finally{setBusy(false);} }
  return <main className="dashboard-page"><div className="container dashboard-wrap"><div className="dashboard-head"><div><span className="kicker">YOUR IMPACT SPACE</span><h1>Good to see you, <em>{user.displayName.split(" ")[0]}.</em></h1><p>Every action here is a small vote for the future you want.</p></div><div className="dashboard-actions"><button className="button button-outline" onClick={()=>setShowGoals(true)}><Icon name="target"/> Assess my goals</button><button className="button button-primary" onClick={()=>setShowForm(true)}><Icon name="plus"/> Log an action</button></div></div>
    <div className="stat-grid"><article className="stat-card primary-stat"><span>ESTIMATED IMPACT</span><strong>{total.toFixed(1)} <small>kg CO₂e</small></strong><p>avoided through your logged actions</p><div className="stat-sprout">♣</div></article><article className="stat-card"><span>ACTIONS LOGGED</span><strong>{user.impacts.length}</strong><p>{user.impacts.length ? "Small wins worth celebrating" : "Your first action starts here"}</p></article><article className="stat-card level-card"><span>YOUR LEVEL</span><div className="level-line"><b>{level.number}</b><strong>{level.name}</strong></div><div className="progress"><i style={{width:`${progress}%`}}/></div><p>{Math.max(0,level.next-total).toFixed(1)} kg to the next milestone</p></article></div>
    <section className="panel goals-panel"><div className="goals-intro"><span className="goal-icon"><Icon name="target" size={25}/></span><div><span className="kicker">YOUR PERSONAL ACTION PLAN</span><h2>{user.goalAssessment ? "Recommended for your goals" : "Not sure where to begin?"}</h2><p>{user.goalAssessment ? `Built from your answers · refreshed ${new Date(user.goalAssessment.completedAt).toLocaleDateString()}` : "Answer six quick questions and get a practical starting plan shaped around your life."}</p></div><button className="button button-small button-dark" onClick={()=>setShowGoals(true)}>{user.goalAssessment ? "Retake assessment" : "Assess my goals"}<Icon name="arrow" size={16}/></button></div>{user.goalAssessment && <div className="recommendation-grid">{user.goalAssessment.recommendations.map((item,index)=><article key={item.id}><div className="recommendation-top"><span>{String(index+1).padStart(2,"0")}</span><b>{item.effort}</b></div><h3>{item.title}</h3><p>{item.description}</p><small>{item.frequency}</small></article>)}</div>}</section>
    <div className="dashboard-grid"><section className="panel"><div className="panel-title"><div><span className="kicker">YOUR MIX</span><h2>Impact by area</h2></div><span className="period">All time</span></div><div className="bar-chart">{byCategory.map(item=><div className="bar-row" key={item.key}><span>{categoryInfo[item.key].label}</span><div><i style={{width:`${total ? Math.max(2,item.value/Math.max(...byCategory.map(x=>x.value))*100) : 0}%`,background:categoryInfo[item.key].color}}/></div><b>{item.value.toFixed(1)}</b></div>)}</div><small className="method-note">Estimates use simple category factors and are directional, not audited carbon accounting.</small></section>
      <section className="panel nudge"><span className="nudge-icon"><Icon name="spark"/></span><span className="kicker">A GENTLE NUDGE</span><h2>Try a no-car trip this week.</h2><p>A five-kilometer walk, cycle, or transit swap can avoid about 1 kg CO₂e—and add a little movement to your day.</p><button onClick={()=>{setCategory("transport");setShowForm(true)}}>Log a travel swap <Icon name="arrow" size={17}/></button></section></div>
    <section className="panel entry-tools"><div className="panel-title"><div><span className="kicker">EASIER DATA ENTRY</span><h2>Put routine activity on autopilot</h2></div></div><div className="entry-tool-grid"><article><span className="tool-icon mint"><Icon name="calendar"/></span><div><h3>Recurring schedules</h3><p>Create a daily, weekly, or monthly routine. Due entries are added automatically and never duplicated.</p></div><button className="button button-small button-dark" onClick={()=>{setError("");setShowSchedule(true)}}><Icon name="plus" size={16}/> New schedule</button></article><article><span className="tool-icon sun"><Icon name="upload"/></span><div><h3>Excel bulk upload</h3><p>Download the guided sample, add up to 500 activities, then upload it in one step.</p></div><button className="button button-small button-outline" onClick={()=>{setError("");setImportResult(null);setShowImport(true)}}><Icon name="upload" size={16}/> Upload workbook</button></article></div></section>
    {!!user.schedules.length && <section className="panel schedule-panel"><div className="panel-title"><div><span className="kicker">YOUR ROUTINES</span><h2>Activity schedules</h2></div><button className="button button-small button-outline" onClick={()=>{setError("");setShowSchedule(true)}}><Icon name="plus" size={16}/> Add another</button></div>{error&&<div className="form-error">{error}</div>}<div className="schedule-list">{user.schedules.map(schedule=><article key={schedule.id} className={!schedule.active?"paused":""}><span className="activity-dot" style={{background:categoryInfo[schedule.category].color}}><Icon name="calendar" size={16}/></span><div><b>{schedule.action}</b><small>{schedule.quantity} {schedule.unit} · {schedule.frequency} · {schedule.active?`next ${new Date(schedule.nextRunDate+"T12:00:00").toLocaleDateString()}`:"paused"}</small></div><span className={`status-chip ${schedule.active?"active":""}`}>{schedule.active?"Active":"Paused"}</span><button className="icon-button" disabled={busy} onClick={()=>changeSchedule(schedule,"toggle")} title={schedule.active?"Pause schedule":"Resume schedule"}><Icon name={schedule.active?"pause":"play"} size={17}/></button><button className="icon-button danger" disabled={busy} onClick={()=>changeSchedule(schedule,"delete")} title="Remove schedule"><Icon name="trash" size={17}/></button></article>)}</div></section>}
    <section className="panel activity-panel"><div className="panel-title"><div><span className="kicker">YOUR RECORD</span><h2>Recent actions</h2></div><a className={`button button-small button-outline ${!user.impacts.length ? "disabled" : ""}`} href={user.impacts.length ? "/api/export" : undefined}><Icon name="download" size={16}/> Export CSV</a></div>{user.impacts.length ? <div className="activity-list">{user.impacts.slice(0,8).map(item=><article key={item.id}><span className="activity-dot" style={{background:categoryInfo[item.category].color}}><Icon name="check" size={16}/></span><div><b>{item.action}</b><small>{categoryInfo[item.category].label} · {new Date(item.date+"T12:00:00").toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}{item.source&&item.source!=="manual"?` · ${item.source==="schedule"?"Scheduled":"Bulk upload"}`:""}</small></div><strong>+{item.co2e.toFixed(1)} <small>kg CO₂e</small></strong></article>)}</div> : <div className="empty-state"><span><Icon name="leaf" size={30}/></span><h3>Your impact story starts here.</h3><p>Log one sustainable choice—big or small—to see your progress take shape.</p><button className="button button-primary" onClick={()=>setShowForm(true)}>Log my first action</button></div>}</section>
    <div className="private-banner"><Icon name="lock"/><div><b>Your space is private.</b><p>Only you can view this dashboard. Download your own activity when you choose to share it.</p></div></div>
  </div>{showForm && <div className="modal-backdrop" onMouseDown={()=>setShowForm(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowForm(false)}>×</button><span className="kicker">ADD TO YOUR STORY</span><h2>Log a sustainable action</h2><p>Choose the closest category. We’ll create a simple directional estimate.</p><form onSubmit={add}><label>Impact area<select name="category" value={category} onChange={e=>setCategory(e.target.value as Impact["category"])}>{Object.entries(categoryInfo).map(([key,val])=><option key={key} value={key}>{val.label}</option>)}</select></label><label>What did you do?<input name="action" required minLength={2} defaultValue={categoryInfo[category].suggestion}/></label><div className="field-row"><label>Amount<input name="quantity" type="number" min="0.01" max="100000" step="0.01" required placeholder="1"/></label><label>Measured in<input value={categoryInfo[category].unit} readOnly/></label></div><label>Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Note <span>Optional</span><textarea name="note" rows={2} placeholder="A detail you want to remember"/></label>{error&&<div className="form-error">{error}</div>}<button className="button button-primary submit-button" disabled={busy}>{busy?"Saving…":"Save this action"}<Icon name="arrow"/></button></form></div></div>}
    {showSchedule && <div className="modal-backdrop" onMouseDown={()=>setShowSchedule(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowSchedule(false)}>×</button><span className="kicker">AUTOMATE A ROUTINE</span><h2>Create an activity schedule</h2><p>We’ll add the activity when it is due. Matching entries are skipped automatically.</p><form onSubmit={addSchedule}><label>Impact area<select name="category" value={scheduleCategory} onChange={e=>setScheduleCategory(e.target.value as Impact["category"])}>{Object.entries(categoryInfo).map(([key,val])=><option key={key} value={key}>{val.label}</option>)}</select></label><label>What will you do?<input name="action" required minLength={2} defaultValue={categoryInfo[scheduleCategory].suggestion}/></label><div className="field-row"><label>Amount<input name="quantity" type="number" min="0.01" max="100000" step="0.01" required placeholder="1"/></label><label>Frequency<select name="frequency" defaultValue="weekly"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label></div><label>Starts on<input name="startDate" type="date" min={new Date().toISOString().slice(0,10)} required defaultValue={new Date().toISOString().slice(0,10)}/></label><label>Note <span>Optional</span><textarea name="note" rows={2} placeholder="A detail about this routine"/></label>{error&&<div className="form-error">{error}</div>}<button className="button button-primary submit-button" disabled={busy}>{busy?"Creating…":"Create schedule"}<Icon name="calendar"/></button></form></div></div>}
    {showImport && <div className="modal-backdrop" onMouseDown={()=>setShowImport(false)}><div className="modal import-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowImport(false)}>×</button><span className="kicker">BULK ACTIVITY UPLOAD</span><h2>Add activities from Excel</h2><p>Use our guided workbook so categories and dates stay consistent.</p><div className="import-steps"><a className="template-download" href="/templates/igreen-activity-upload.xlsx" download><span><Icon name="download"/></span><div><b>1. Download the sample workbook</b><small>Includes instructions, category choices, and an example tab.</small></div></a><form onSubmit={uploadActivities}><label className="file-picker"><span><Icon name="upload" size={24}/></span><b>2. Choose your completed workbook</b><input type="file" name="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required/></label>{error&&<div className="form-error">{error}</div>}{importResult&&<div className="import-result"><b>{importResult.inserted} activities added</b><span>{importResult.duplicates} duplicates skipped · {importResult.invalid} invalid rows skipped</span></div>}<button className="button button-primary submit-button" disabled={busy}>{busy?"Checking and importing…":"Upload activities"}<Icon name="upload"/></button></form></div><small className="method-note">Duplicates are checked within the workbook and against your existing activity log.</small></div></div>}
    {showGoals && <GoalAssessmentModal user={user} onClose={()=>setShowGoals(false)} onSaved={(updated)=>{setUser(updated);setShowGoals(false)}}/>}</main>;
}

const goalQuestions: Array<{ key: keyof GoalAnswers; question: string; hint: string; options: Array<[string,string,string]> }> = [
  { key: "focus", question: "What matters most to you right now?", hint: "This helps us choose actions with benefits you care about.", options: [["climate","Climate impact","Reduce my footprint"],["cost","Saving money","Lower everyday costs"],["wellbeing","Health & wellbeing","Feel better while acting"],["community","Community","Bring others along"]] },
  { key: "pace", question: "What pace feels realistic?", hint: "A good plan should fit your available energy.", options: [["starter","Start small","Three simple actions"],["steady","Build momentum","A balanced action plan"],["leader","Lead change","Take on a bigger role"]] },
  { key: "setting", question: "Where can you influence change?", hint: "Choose the setting where you spend the most time.", options: [["rent","I rent","Flexible, no-renovation ideas"],["own","I own my home","Household improvements"],["workplace","At work","Team and operations"]] },
  { key: "transport", question: "How do you usually get around?", hint: "Choose the closest match for a normal week.", options: [["car","Mostly by car","I drive most journeys"],["mixed","A mix","Car plus transit or active travel"],["low-carbon","Mostly low-carbon","Walk, cycle, transit or EV"],["remote","Mostly at home","Very little routine travel"]] },
  { key: "food", question: "Which best describes your meals?", hint: "There is no perfect answer—this only shapes your recommendations.", options: [["omnivore","Mixed diet","Meat most days"],["flexitarian","Flexitarian","Some plant-first meals"],["plant-forward","Plant-forward","Mostly or fully plant-based"]] },
  { key: "barrier", question: "What most often gets in the way?", hint: "We’ll favor actions that work around this barrier.", options: [["time","Time","My schedule is full"],["cost","Cost","It needs to be affordable"],["knowledge","Know-how","I need clearer guidance"],["support","Support","I want others involved"]] },
];

function GoalAssessmentModal({ user, onClose, onSaved }: { user: SafeUser; onClose: () => void; onSaved: (user: SafeUser) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<GoalAnswers>>(user.goalAssessment?.answers || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const question = goalQuestions[step];
  const selected = answers[question.key];

  async function next() {
    if (!selected) return;
    if (step < goalQuestions.length - 1) { setStep(step + 1); return; }
    setBusy(true); setError("");
    try {
      const data = await api<{ user: SafeUser }>("/api/goals", { method: "POST", body: JSON.stringify(answers) });
      onSaved(data.user);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create your plan."); setBusy(false); }
  }

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal assessment-modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button><div className="assessment-progress"><span>YOUR GOAL ASSESSMENT</span><b>{step+1} / {goalQuestions.length}</b><div><i style={{width:`${((step+1)/goalQuestions.length)*100}%`}}/></div></div><div className="question-count">{String(step+1).padStart(2,"0")}</div><h2>{question.question}</h2><p>{question.hint}</p><div className="answer-options">{question.options.map(([value,label,description])=><button key={value} className={selected===value ? "selected" : ""} onClick={()=>setAnswers({...answers,[question.key]:value})}><span className="radio-dot"/><span><b>{label}</b><small>{description}</small></span>{selected===value&&<Icon name="check" size={18}/>}</button>)}</div>{error&&<div className="form-error">{error}</div>}<div className="assessment-nav"><button className="back-button" disabled={step===0||busy} onClick={()=>setStep(step-1)}>← Previous</button><button className="button button-primary" disabled={!selected||busy} onClick={next}>{busy?"Building your plan…":step===goalQuestions.length-1?"Create my action plan":"Next question"}<Icon name="arrow" size={17}/></button></div><small className="assessment-private"><Icon name="lock" size={13}/> Your answers stay in your private member profile.</small></div></div>;
}

function Admin({ data }: { data: AdminData | null }) {
  const totalActions = data?.users.reduce((s,u)=>s+u.impacts.length,0) || 0; const totalImpact = data?.users.reduce((s,u)=>s+u.impacts.reduce((a,i)=>a+i.co2e,0),0) || 0;
  return <main className="dashboard-page admin-page"><div className="container dashboard-wrap"><div className="dashboard-head"><div><span className="kicker">PRIVATE ADMIN CONSOLE</span><h1>Community <em>overview.</em></h1><p>Registration details and participation are visible only in this protected session.</p></div><span className="secure-badge"><Icon name="lock" size={15}/> Admin only</span></div>{!data?<div className="panel loading-panel">Loading community data…</div>:<><div className="stat-grid"><article className="stat-card primary-stat"><span>COMMUNITY MEMBERS</span><strong>{data.users.length}</strong><p>registered impact profiles</p></article><article className="stat-card"><span>ACTIONS LOGGED</span><strong>{totalActions}</strong><p>community contributions</p></article><article className="stat-card"><span>ESTIMATED IMPACT</span><strong>{totalImpact.toFixed(1)} <small>kg CO₂e</small></strong><p>across all logged activities</p></article></div><section className="panel admin-table-panel"><div className="panel-title"><div><span className="kicker">REGISTRATIONS</span><h2>Community members</h2></div><small>Data store created {new Date(data.createdAt).toLocaleDateString()}</small></div>{data.users.length?<div className="table-scroll"><table><thead><tr><th>Member</th><th>Type</th><th>Organization</th><th>Location</th><th>Joined</th><th>Actions</th><th>Impact</th></tr></thead><tbody>{data.users.map(u=><tr key={u.id}><td><b>{u.displayName}</b><small>{u.email}</small></td><td><span className="type-chip">{u.accountType}</span></td><td>{u.organization||"—"}</td><td>{u.city||"—"}</td><td>{new Date(u.createdAt).toLocaleDateString()}</td><td>{u.impacts.length}</td><td>{u.impacts.reduce((s,i)=>s+i.co2e,0).toFixed(1)} kg</td></tr>)}</tbody></table></div>:<div className="empty-state"><span><Icon name="people"/></span><h3>No registrations yet</h3><p>New members will appear here after they create an account.</p></div>}</section><div className="private-banner"><Icon name="lock"/><div><b>Handle community data with care.</b><p>Passwords never appear here. Avoid sharing screenshots or exported personal information.</p></div></div></>}</div></main>;
}
