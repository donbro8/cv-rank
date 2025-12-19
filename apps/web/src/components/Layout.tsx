import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const { user } = useAuth();

    const handleLogout = async () => {
        // Clear active job if wanted, though usually we want to persist state unless explicitly clearing
        // but for security on logout we might want to clear.
        localStorage.removeItem('activeJobId');
        await authService.logout();
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--glass-border)',
                padding: '1.5rem 1rem'
            }}>
                <h2 style={{ color: 'var(--primary)', marginBottom: '2rem', fontSize: '1.25rem' }}>Intelli-Hire</h2>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                    }}>Menu</p>
                    <Link
                        to="/"
                        className="btn"
                        style={{
                            justifyContent: 'flex-start',
                            backgroundColor: location.pathname === '/' ? 'var(--bg-surface)' : 'transparent',
                            color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Dashboard
                    </Link>
                    <Link
                        to="/candidates"
                        className="btn"
                        style={{
                            justifyContent: 'flex-start',
                            backgroundColor: location.pathname.startsWith('/candidates') ? 'var(--bg-surface)' : 'transparent',
                            color: location.pathname.startsWith('/candidates') ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}
                    >
                        Candidates
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <header style={{
                    height: '64px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    backgroundColor: 'var(--bg-primary)'
                }}>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                        {location.pathname === '/' ? 'Overview' : 'Candidate Pipeline'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {user && (
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Welcome, {user.username || 'Recruiter'}</span>
                        )}
                        <button
                            onClick={handleLogout}
                            style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            Sign Out
                        </button>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                    </div>
                </header>
                <div style={{ padding: '2rem', overflowY: 'auto' }}>
                    {children || <Outlet />}
                </div>
            </main>
        </div>
    );
};
