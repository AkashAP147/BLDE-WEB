import React from 'react';

const Maintenance = () => {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.iconContainer}>
          <svg
            style={styles.icon}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
        <h1 style={styles.title}>Under Maintenance</h1>
        <p style={styles.message}>
          We are currently experiencing a database issue. Our team is actively working to resolve it. Please check back soon!
        </p>
        <div style={styles.pulseContainer}>
          <div style={styles.pulseDot}></div>
          <span style={styles.pulseText}>Systems are being restored</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    fontFamily: '"Inter", "Roboto", sans-serif',
    padding: '20px',
  },
  content: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '48px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    color: '#f8fafc',
    animation: 'fadeIn 0.5s ease-out',
  },
  iconContainer: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.5)',
  },
  icon: {
    width: '40px',
    height: '40px',
    color: '#ffffff',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '16px',
    letterSpacing: '-0.025em',
    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  message: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#cbd5e1',
    marginBottom: '32px',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '12px 24px',
    borderRadius: '9999px',
    display: 'inline-flex',
  },
  pulseDot: {
    width: '10px',
    height: '10px',
    backgroundColor: '#fbbf24',
    borderRadius: '50%',
    boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.7)',
    animation: 'pulse 2s infinite',
  },
  pulseText: {
    fontSize: '14px',
    color: '#94a3b8',
    fontWeight: '500',
  },
};

// Add global keyframes for animations
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);

export default Maintenance;
