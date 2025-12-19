import React, { useState } from 'react';
import { login, register, loginWithGoogle } from '../services/authService';

export const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
                window.location.reload();
            } else {
                await register(username, email, password);
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential') {
                setError("Incorrect email or password.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered.");
            } else if (err.code === 'auth/weak-password') {
                setError("Password should be at least 6 characters.");
            } else {
                setError(err.message || 'Authentication failed');
            }
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setLoading(true);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            console.error(err);
            setError("Google sign-in failed. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-primary)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                padding: '2.5rem',
                borderRadius: '1rem',
                boxShadow: 'var(--glass-shadow)',
                width: '100%',
                maxWidth: '400px',
                border: '1px solid var(--glass-border)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem auto'
                    }}>
                        <svg style={{ width: '32px', height: '32px', color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        Intelligent Recruitment Platform
                    </p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="btn"
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-border)',
                        marginBottom: '1.5rem',
                        position: 'relative'
                    }}
                >
                    {loading ? 'Processing...' : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Sign in with Google
                        </span>
                    )}
                </button>

                <div style={{ position: 'relative', margin: '1.5rem 0', textAlign: 'center' }}>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />
                    <span style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'var(--bg-secondary)',
                        padding: '0 0.5rem',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem'
                    }}>
                        OR EMAIL
                    </span>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!isLogin && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Full Name</label>
                            <input
                                type="text"
                                required={!isLogin}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '0.375rem',
                                    backgroundColor: 'var(--bg-surface)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.375rem',
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                borderRadius: '0.375rem',
                                backgroundColor: 'var(--bg-surface)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{
                            color: 'var(--error)',
                            fontSize: '0.875rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: '0.75rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--error)'
                        }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
};
