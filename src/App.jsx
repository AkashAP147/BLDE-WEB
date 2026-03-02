import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
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
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 300 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, fontSize: 18, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: 10, fontSize: 18, borderRadius: 6, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700 }}>Submit</button>
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
      if (input === "123") {
        setTeachersAuth(true);
        setTeachersPass(input);
      } else {
        setError("Incorrect password");
      }
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 80 }}>
        <h2>Enter Teachers Corner Password</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 300 }}>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            style={{ padding: 10, fontSize: 18, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <button type="submit" style={{ padding: 10, fontSize: 18, borderRadius: 6, background: "#1e40af", color: "#fff", border: "none", fontWeight: 700 }}>Submit</button>
          {error && <span style={{ color: "#ef4444" }}>{error}</span>}
        </form>
      </div>
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
      {/* Responsive Nav */}
      <nav>
        {/* Desktop Nav */}
        <div className="nav-desktop" style={{ display: 'flex', gap: 24, alignItems: 'center', padding: '16px 0', justifyContent: 'center' }}>
          <Link to="/">Dashboard</Link>
          <Link to="/toppers">Toppers</Link>
          <Link to="/teachers-corner">Teachers Corner</Link>
          <Link to="/students">Admin Corner</Link>
          <Link to="/about">About</Link>
        </div>
        {/* Mobile Nav (Hamburger or Close) */}
        <div
          className={`nav-mobile${!menuOpen && !menuBtnVisible ? ' nav-mobile-hide' : ''}`}
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 3000,
          }}
        >
          {!menuOpen ? (
            <button aria-label="Open menu" style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }} onClick={() => setMenuOpen(true)}>
              <MenuIcon sx={{ fontSize: 36, color: '#fff' }} />
            </button>
          ) : (
            <button aria-label="Close menu" style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }} onClick={() => setMenuOpen(false)}>
              <CloseIcon sx={{ fontSize: 36, color: '#fff' }} />
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
          <button aria-label="Close menu" style={{ background: 'none', border: 'none', position: 'absolute', top: 12, left: 12, padding: 0, margin: 0, cursor: 'pointer' }} onClick={() => setMenuOpen(false)}>
            <CloseIcon sx={{ fontSize: 36, color: '#1e293b' }} />
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 56 }}>
            <Link to="/" style={{
              color: window.location.pathname === '/' ? '#1e40af' : '#475569',
              background: window.location.pathname === '/' ? '#eff6ff' : 'none',
              fontSize: 18,
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
              fontSize: 18,
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
              fontSize: 18,
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
              fontSize: 18,
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
              fontSize: 18,
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
      `}</style>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={studentsAuth ? <AllStudents /> : <StudentsPasswordPrompt />} />
        <Route path="/toppers" element={<Toppers />} />
        <Route path="/teachers-corner" element={teachersAuth ? <TeachersCorner /> : <TeachersPasswordPrompt />} />
        <Route path="/about" element={<About />} />
      </Routes>

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
          Powered by <span style={{ color: '#ffb300', fontWeight:  100}}>Akash Patil</span> | <span style={{ color: '#80bfda', fontWeight: 400 }}>&copy; {new Date().getFullYear()} Build</span>
        </div>
      )}
    </Router>
  );
}

export default App;
