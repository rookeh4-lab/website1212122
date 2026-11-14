import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../utils/api';

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function loadUser() {
      const data = await auth.getProfile();
      if (active) setUser(data?.user || null);
    }
    loadUser();
    return () => { active = false; };
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  const handleLogout = async () => {
    await auth.clear();
    setUser(null);
    setMobileOpen(false);
    navigate('/login');
  };

  return (
    <header
      style={{
        width: '100%',
        padding: '16px 20px',
        position: 'relative',
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            justifyContent: 'flex-start',
            gap: '12px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              gap: '10px',
            }}
          >
            <img
              src="/logo.png"
              alt="5.55 Client"
              style={{
                height: '38px',
                width: 'auto',
                maxWidth: '65px',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />
            <span
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              5.55 Client
            </span>
          </Link>
        </div>

        <nav className="navbar-desktop-nav">
          <Link
            to="/"
            style={{
              color: location.pathname === '/' ? '#ffffff' : '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Home
          </Link>
          <Link
            to="/checkout"
            style={{
              color: location.pathname === '/checkout' ? '#ffffff' : '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Pricing
          </Link>
          <Link
            to="/trial"
            style={{
              color: location.pathname === '/trial' ? '#ffffff' : '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Free Trial
          </Link>
          <a
            href="/#showcase"
            style={{
              color: '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Showcase
          </a>
          <Link
            to="/stats"
            style={{
              color: location.pathname === '/stats' ? '#ffffff' : '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Stats
          </Link>
          <a
            href="https://discord.gg/xx7Ns6vW8"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#9494a0',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'color 0.15s',
            }}
          >
            Discord
          </a>
          {(user?.role === 'admin' || ['rookeh4@gmail.com', 'rabinzzz113@gmail.com', 'rabinjj09@gmail.com'].includes(user?.email?.toLowerCase())) && (
            <Link
              to="/admin"
              style={{
                color: '#f43f5e',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 700,
                transition: 'color 0.15s',
              }}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="navbar-desktop-user">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '9999px',
                  padding: '7px 16px 7px 8px',
                  textDecoration: 'none',
                  color: '#09090b',
                  fontWeight: 600,
                  fontSize: '13.5px',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#10b981',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        background: '#fff',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </div>
                <span>{user.displayName || user.username || 'User'}</span>
              </Link>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '9999px',
                  padding: '7px 16px',
                  color: '#9494a0',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                title="Log Out"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ffffff',
                border: 'none',
                outline: 'none',
                borderRadius: '9999px',
                padding: '9px 24px',
                textDecoration: 'none',
                color: '#09090b',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              Sign In
            </Link>
          )}
        </div>

        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          )}
        </button>

        {mobileOpen && (
          <>
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                zIndex: 90,
              }}
              onClick={() => setMobileOpen(false)}
            />
            <div className="navbar-mobile-drawer">
              {user ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: '14px',
                    padding: '10px 14px',
                    marginBottom: '4px',
                  }}
                >
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      textDecoration: 'none',
                      color: '#ffffff',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            background: '#fff',
                            borderRadius: '50%',
                          }}
                        />
                      )}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                      {user.displayName || user.username || 'User'}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#9494a0',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    Log out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    textDecoration: 'none',
                    color: '#09090b',
                    fontWeight: 700,
                    fontSize: '14px',
                    marginBottom: '8px',
                  }}
                >
                  Sign In
                </Link>
              )}

              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Home
              </Link>
              <Link
                to="/checkout"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Pricing
              </Link>
              <Link
                to="/trial"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Free Trial
              </Link>
              <a
                href="/#showcase"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Showcase
              </a>
              <Link
                to="/stats"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Stats
              </Link>
              <Link
                to="/changelog"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Changelog
              </Link>
              <Link
                to="/status"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Status
              </Link>
              <Link
                to="/affiliates"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Affiliates
              </Link>
              <a
                href="https://discord.gg/xx7Ns6vW8"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="navbar-mobile-link"
              >
                Discord
              </a>
              {(user?.role === 'admin' || ['rookeh4@gmail.com', 'rabinzzz113@gmail.com', 'rabinjj09@gmail.com'].includes(user?.email?.toLowerCase())) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="navbar-mobile-link"
                  style={{ color: '#f43f5e', fontWeight: 700 }}
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
