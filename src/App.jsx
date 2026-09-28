import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { StudentDataProvider, useStudentData } from "./StudentDataContext";
import SyncIcon from '@mui/icons-material/Sync';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import InfoIcon from '@mui/icons-material/Info';
import { useEffect } from "react";
import Dashboard from "./components/Dashboard";
import AllStudents from "./components/AllStudents";
import { useState } from "react";
import Toppers from "./components/Toppers";
import TeachersCorner from "./components/TeachersCorner";
import About from "./components/About";
import logo from "./assets/bldeacet-logo.webp";
import "./App.css";

function App() {
  // Mobile menu button visibility state
  const [menuBtnVisible, setMenuBtnVisible] = useState(true);
  useEffect(() => {
    function handleMenuBtnScroll() {
      setMenuBtnVisible(window.scrollY < 10);
    }
    window.addEventListener('scroll', handleMenuBtnScroll);
    return () => window.removeEventListener('scroll', handleMenuBtnScroll);
  }, []);
  // Footer visibility state
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          const windowHeight = window.innerHeight;
          const docHeight = document.documentElement.scrollHeight;
          // Show footer if at bottom, hide if scrolling up
          if (windowHeight + scrollY >= docHeight - 2) {
            setFooterVisible(true);
          } else if (scrollY < lastScrollY) {
            setFooterVisible(false);
          }
          lastScrollY = scrollY;
          ticking = false;
        });
        ticking = true;
      }
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  // Password state for All Students page
  const [studentsPass, setStudentsPass] = useState("");
  const [studentsAuth, setStudentsAuth] = useState(false);
  // Password state for Teachers Corner
  const [teachersPass, setTeachersPass] = useState("");
  const [teachersAuth, setTeachersAuth] = useState(false);

  // Password prompt component for Admin Corner
  function StudentsPasswordPrompt() {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const handleSubmit = (e) => {
      e.preventDefault();
      if (input === "96500") {
        setStudentsAuth(true);
        setStudentsPass(input);
      } else {
        setError("Incorrect password");
      }
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
        <h2>Enter your Password </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: '90%', maxWidth: 300 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, fontSize: 18, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: '12px', fontSize: 18, borderRadius: 8, background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff", border: "none", fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>Submit</button>
          {error && <span style={{ color: "#ef4444" }}>{error}</span>}
        </form>
      </div>
    );
  }

  // Password prompt component for Teachers Corner
  function TeachersPasswordPrompt() {
    const [input, setInput] = useState("");
    const [error, setError] = useState("");
    const handleSubmit = (e) => {
      e.preventDefault();
      if (input === "BLDE@root123") {
        setTeachersAuth(true);
        setTeachersPass(input);
      } else {
        setError("Incorrect password");
      }
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
        <h2>Enter Teachers Corner Password</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: '90%', maxWidth: 300 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, fontSize: 18, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: '12px', fontSize: 18, borderRadius: 8, background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)", color: "#fff", border: "none", fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(15,23,42,0.2)' }}>Submit</button>
          {error && <span style={{ color: "#ef4444" }}>{error}</span>}
        </form>
      </div>
    );
  }


  // Sync status banner component
  function SyncStatusBanner() {
    const { syncing, syncProgress, lastSyncedAt, syncNow, clearAndSync } = useStudentData();
    
    const formatDate = (ts) => {
      if (!ts) return 'Never';
      const d = new Date(ts);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
      <>
        {/* Sync status bar */}
        {(syncing || syncProgress) && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
            background: 'linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%)',
            color: '#fff', padding: '8px 16px', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
            animation: 'slideDown 0.3s ease',
          }}>
            {syncing && (
              <SyncIcon sx={{ fontSize: 18, animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            )}
            {syncProgress}
          </div>
        )}


      </>
    );
  }

  // Mobile menu state
  const [menuOpen, setMenuOpen] = useState(false);
  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [window.location.pathname]);

  return (
    <Router>
      <StudentDataProvider>
      <SyncStatusBanner />
      {/* Responsive Nav */}
      <nav>
        {/* Desktop Nav */}
        <div className="nav-desktop" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 60px',
          height: '85px',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%)',
          boxShadow: '0 4px 25px rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src={logo} alt="BLDEACET Logo" style={{ height: 60, width: 'auto', filter: 'brightness(1.1)' }} />
              <div style={{ height: 45, width: '1.5px', background: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 900, fontSize: 26, color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em' }}>BLDEACET</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em', marginTop: 5, textTransform: 'uppercase' }}>Results Portal</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 10, opacity: 0.8, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 20 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.4 }}>V.P. Dr. P.G. Halakatti College of</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1', lineHeight: 1.4 }}>Engineering & Technology, Vijayapura</span>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: 36, alignItems: 'center' }}>
            <Link to="/" className="nav-link" style={{ textDecoration: 'none', fontWeight: 700, color: '#f8fafc', fontSize: 18, transition: 'all 0.3s' }}>Dashboard</Link>
            <Link to="/toppers" className="nav-link" style={{ textDecoration: 'none', fontWeight: 700, color: '#f8fafc', fontSize: 18, transition: 'all 0.3s' }}>Toppers</Link>
            <Link to="/teachers-corner" className="nav-link" style={{ textDecoration: 'none', fontWeight: 700, color: '#f8fafc', fontSize: 18, transition: 'all 0.3s' }}>Teachers Corner</Link>
            <Link to="/students" className="nav-link" style={{ textDecoration: 'none', fontWeight: 700, color: '#f8fafc', fontSize: 18, transition: 'all 0.3s' }}>Admin Corner</Link>
            <Link to="/about" className="nav-link" style={{ textDecoration: 'none', fontWeight: 700, color: '#f8fafc', fontSize: 18, transition: 'all 0.3s' }}>About</Link>
            
          </div>
        </div>
        {/* Mobile Nav Header */}
        <div
          className={`nav-mobile${!menuOpen && !menuBtnVisible ? ' nav-mobile-hide' : ''}`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 65,
            background: 'linear-gradient(90deg, #0f172a 0%, #1e3a8a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            zIndex: 3000,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: !menuOpen && !menuBtnVisible ? 'translateY(-100%)' : 'translateY(0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={logo} alt="Logo" style={{ height: 40, width: 'auto', filter: 'brightness(1.1)' }} />
            <span style={{ fontWeight: 900, color: '#ffffff', fontSize: 19, letterSpacing: '-0.02em' }}>BLDEACET</span>
          </div>
          {!menuOpen ? (
            <button aria-label="Open menu" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setMenuOpen(true)}>
              <MenuIcon sx={{ fontSize: 28, color: '#ffffff' }} />
            </button>
          ) : (
            <button aria-label="Close menu" style={{ background: 'rgba(239, 68, 68, 0.2)', border: 'none', width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setMenuOpen(false)}>
              <CloseIcon sx={{ fontSize: 28, color: '#f87171' }} />
            </button>
          )}
        </div>
        {/* Animated Slide-in menu (always rendered, animates in/out) */}
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '82vw',
            maxWidth: 340,
            height: '100vh',
            background: '#ffffff',
            boxShadow: '2px 0 16px rgba(0,0,0,0.1)',
            zIndex: 4000,
            display: 'flex',
            flexDirection: 'column',
            borderTopRightRadius: 16,
            borderBottomRightRadius: 16,
            padding: '24px 0 0 0',
            transition: 'transform 0.3s cubic-bezier(.68,-0.55,.27,1.55), opacity 0.2s',
            transform: menuOpen ? 'translateX(0)' : 'translateX(-5%)',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
          }}
        >
          <button aria-label="Close menu" style={{ background: 'none', border: 'none', position: 'absolute', top: 12, right: 12, padding: 0, margin: 0, cursor: 'pointer' }} onClick={() => setMenuOpen(false)}>
            <CloseIcon sx={{ fontSize: 36, color: '#1e293b' }} />
          </button>
          <div style={{ padding: '32px 24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid #f1f5f9', marginBottom: 12 }}>
            <img src={logo} alt="BLDEACET Logo" style={{ height: 60, width: 'auto', marginBottom: 12 }} />
            <span style={{ fontWeight: 800, fontSize: 22, color: '#1e40af' }}>BLDEACET</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Results Portal</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link to="/" style={{
              color: window.location.pathname === '/' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/' ? '#eff6ff' : 'none',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }} onClick={() => setMenuOpen(false)}>
              <HomeIcon sx={{ fontSize: 24, opacity: 0.8 }} /> Home
            </Link>
            <Link to="/toppers" style={{
              color: window.location.pathname === '/toppers' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/toppers' ? '#eff6ff' : 'none',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }} onClick={() => setMenuOpen(false)}>
              <EmojiEventsIcon sx={{ fontSize: 24, opacity: 0.8 }} /> Toppers
            </Link>
            <Link to="/teachers-corner" style={{
              color: window.location.pathname === '/teachers-corner' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/teachers-corner' ? '#eff6ff' : 'none',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }} onClick={() => setMenuOpen(false)}>
              <SchoolIcon sx={{ fontSize: 24, opacity: 0.8 }} /> Teachers Corner
            </Link>
            <Link to="/students" style={{
              color: window.location.pathname === '/students' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/students' ? '#eff6ff' : 'none',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }} onClick={() => setMenuOpen(false)}>
              <AdminPanelSettingsIcon sx={{ fontSize: 24, opacity: 0.8 }} /> Admin Corner
            </Link>
            <Link to="/about" style={{
              color: window.location.pathname === '/about' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/about' ? '#eff6ff' : 'none',
              fontSize: 20,
              fontWeight: 700,
              padding: '12px 24px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              textDecoration: 'none',
            }} onClick={() => setMenuOpen(false)}>
              <InfoIcon style={{ verticalAlign: 'middle', marginRight: 4 }} /> About
            </Link>
          </div>
        </div>
      </nav>

      <style>{`
        @media (max-width: 900px) {
          .nav-desktop { display: none !important; }
          .nav-mobile { display: block !important; }
          .nav-mobile.nav-mobile-hide { display: none !important; }
        }
        @media (min-width: 901px) {
          .nav-mobile { display: none !important; }
        }
        @media (max-width: 900px) {
          .main-content { padding-top: 60px; }
        }
        .nav-link:hover {
          color: #38bdf8 !important;
          transform: translateY(-2px);
        }
      `}</style>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={studentsAuth ? <AllStudents /> : <StudentsPasswordPrompt />} />
          <Route path="/toppers" element={<Toppers />} />
          <Route path="/teachers-corner" element={teachersAuth ? <TeachersCorner /> : <TeachersPasswordPrompt />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      {/* Global Footer - only show at page bottom */}
      {footerVisible && (
        <div style={{
          position: 'fixed',
          left: 0,
          bottom: 0,
          margin: 0,
          padding: '8px 24px 8px 12px',
          textAlign: 'left',
          color: '#64748b',
          fontSize: 16,
          fontWeight: 600,
          background: 'rgba(255,255,255,0.9)',
          borderTopRightRadius: 12,
          zIndex: 2000,
          transition: 'opacity 0.3s',
          opacity: footerVisible ? 1 : 0,
        }}>
          Powered by <span style={{ color: '#ffb300', fontWeight: 100 }}>Akash Patil</span> | <span style={{ color: '#80bfda', fontWeight: 400 }}>&copy; {new Date().getFullYear()} Build</span>
        </div>
      )}
    </StudentDataProvider>
    </Router>
  );
}

export default App;
