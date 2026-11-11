import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  // Data states
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [token, setToken] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Create license form state
  const [newLicProduct, setNewLicProduct] = useState('java-client');
  const [newLicUserId, setNewLicUserId] = useState('');
  const [newLicDevices, setNewLicDevices] = useState(1);
  const [licCreating, setLicCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState('');

  // Release upload state
  const [relProduct, setRelProduct] = useState('java-client');
  const [relVersion, setRelVersion] = useState('1.2.0');
  const [relFileType, setRelFileType] = useState('jar');
  const [relSha256, setRelSha256] = useState('');
  const [relChangelog, setRelChangelog] = useState('');
  const [relUploading, setRelUploading] = useState(false);

  useEffect(() => {
    let active = true;
    const checkAdmin = async () => {
      try {
        const profileData = await auth.getProfile();
        if (!active) return;
        if (!profileData?.user) {
          navigate('/login');
          return;
        }
        if (profileData.role !== 'admin' && profileData.user.role !== 'admin') {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        const curToken = await auth.getToken();
        setToken(curToken);
        await loadAdminData(curToken);
      } catch (err) {
        console.error('Admin check failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    checkAdmin();
    return () => { active = false; };
  }, [navigate]);

  const loadAdminData = async (t) => {
    try {
      const [uRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API_BASE}/admin/audit-logs`, { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const [uData, aData] = await Promise.all([uRes.json(), aRes.json()]);
      if (uData.users) setUsers(uData.users);
      if (aData.logs) setAuditLogs(aData.logs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    setLicCreating(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/admin/licenses/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_slug: newLicProduct,
          user_id: newLicUserId.trim() || null,
          max_devices: parseInt(newLicDevices, 10),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedKey(data.license.license_key);
        setStatusMsg({ text: `License created: ${data.license.license_key}`, type: 'success' });
        await loadAdminData(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to create license', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error connecting to admin licensing service', type: 'danger' });
    } finally {
      setLicCreating(false);
    }
  };

  const handleRevokeLicense = async (licenseId) => {
    if (!window.confirm('Are you sure you want to revoke this license permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/licenses/${licenseId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: 'License revoked successfully', type: 'success' });
        await loadAdminData(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to revoke license', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error contacting revocation endpoint', type: 'danger' });
    }
  };

  const handleBanUser = async (userId, currentBanned) => {
    const reason = window.prompt(currentBanned ? 'Unban reason:' : 'Reason for suspension:', 'Terms violation');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: 'User status updated', type: 'success' });
        await loadAdminData(token);
      } else {
        setStatusMsg({ text: data.error || 'Action failed', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error contacting ban endpoint', type: 'danger' });
    }
  };

  const handleUploadRelease = async (e) => {
    e.preventDefault();
    setRelUploading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/admin/releases/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_slug: relProduct,
          version: relVersion.trim(),
          file_type: relFileType,
          sha256: relSha256.trim() || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          storage_path: `releases/${relProduct}/${relVersion}/package.${relFileType}`,
          changelog: relChangelog.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Release ${relVersion} uploaded & signed with Ed25519!`, type: 'success' });
        setRelChangelog('');
      } else {
        setStatusMsg({ text: data.error || 'Failed to publish release', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error publishing release', type: 'danger' });
    } finally {
      setRelUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
        Authenticating Administrator Session...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ maxWidth: '600px', padding: '80px 20px', textAlign: 'center' }}>
        <div className="card" style={{ padding: '40px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '22px', color: '#f87171', marginBottom: '12px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            This portal is restricted strictly to authorized 5.55 Client administrators. Your account does not hold administrator privileges.
          </p>
          <Link to="/dashboard" className="btn btn-primary" style={{ padding: '10px 24px' }}>
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1100px', padding: '40px 20px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
            Super Admin
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>
            5.55 Administration Center
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Manage Supabase profiles, licenses, HWID devices, signed releases, and audit logs.
          </p>
        </div>
        <button
          onClick={() => loadAdminData(token)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px 16px' }}
        >
          🔄 Refresh Database
        </button>
      </div>

      {statusMsg.text && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            marginBottom: '20px',
            background: statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${statusMsg.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: statusMsg.type === 'success' ? '#4ade80' : '#f87171',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'users', label: `Users (${users.length})` },
          { id: 'licenses', label: 'Create License' },
          { id: 'releases', label: 'Releases & Signing' },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.id ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. USERS TAB */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Registered Accounts</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '10px 12px' }}>Email / Username</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Licenses</th>
                  <th style={{ padding: '10px 12px' }}>Devices</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{u.username || 'Anonymous'}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-dim)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${u.role === 'admin' ? 'badge-primary' : 'badge-secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ color: u.licenses?.length > 0 ? '#4ade80' : 'var(--text-dim)' }}>
                        {u.licenses?.length || 0} active
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-dim)' }}>
                      {u.devices?.length || 0} HWIDs
                    </td>
                    <td style={{ padding: '12px' }}>
                      {u.banned_at ? (
                        <span style={{ color: '#f87171', fontWeight: 600 }}>Suspended</span>
                      ) : (
                        <span style={{ color: '#4ade80' }}>Active</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleBanUser(u.id, !!u.banned_at)}
                        className={`btn btn-sm ${u.banned_at ? 'btn-secondary' : 'btn-danger'}`}
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                      >
                        {u.banned_at ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CREATE LICENSE TAB */}
      {activeTab === 'licenses' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Mint Product License</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              Generate genuine, cryptographically authenticated 5.55 license keys.
            </p>

            <form onSubmit={handleCreateLicense}>
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Product</label>
                <select
                  value={newLicProduct}
                  onChange={(e) => setNewLicProduct(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13.5px', padding: '10px' }}
                >
                  <option value="java-client">5.55 Java Fabric Client</option>
                  <option value="cpp-client">5.55 C++ Native Client</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Bind to User ID (Optional)</label>
                <input
                  type="text"
                  value={newLicUserId}
                  onChange={(e) => setNewLicUserId(e.target.value)}
                  className="form-control"
                  placeholder="UUID or leave blank for unassigned"
                  style={{ fontSize: '13.5px', padding: '10px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Max Devices (HWID limit)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newLicDevices}
                  onChange={(e) => setNewLicDevices(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13.5px', padding: '10px' }}
                />
              </div>

              <button
                type="submit"
                disabled={licCreating}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', fontWeight: 700 }}
              >
                {licCreating ? 'Minting License…' : 'Mint License Key →'}
              </button>
            </form>
          </div>

          {createdKey && (
            <div className="card" style={{ padding: '24px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--primary)' }}>
              <span className="badge badge-success">Newly Minted Key</span>
              <h3 style={{ fontSize: '16px', color: '#fff', margin: '12px 0 6px' }}>Ready for Redemption</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                This key can be redeemed on any account or provided to the buyer:
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.6)',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontFamily: 'monospace',
                  fontSize: '15px',
                  color: '#38bdf8',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                <span>{createdKey}</span>
                <button
                  type="button"
                  onClick={() => copyText(createdKey)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. RELEASES & ED25519 SIGNING TAB */}
      {activeTab === 'releases' && (
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>Publish Signed Release</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Manifests are automatically signed with the server's private Ed25519 key for client tampering protection.
          </p>

          <form onSubmit={handleUploadRelease}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px' }}>Product</label>
                <select
                  value={relProduct}
                  onChange={(e) => setRelProduct(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13.5px', padding: '10px' }}
                >
                  <option value="java-client">Java Fabric Client</option>
                  <option value="cpp-client">C++ Client</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px' }}>Version String</label>
                <input
                  type="text"
                  value={relVersion}
                  onChange={(e) => setRelVersion(e.target.value)}
                  className="form-control"
                  placeholder="e.g. 1.2.1"
                  required
                  style={{ fontSize: '13.5px', padding: '10px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11.5px' }}>File Type</label>
                <select
                  value={relFileType}
                  onChange={(e) => setRelFileType(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '13.5px', padding: '10px' }}
                >
                  <option value="jar">.jar (Fabric mod)</option>
                  <option value="exe">.exe (Launcher/Injector)</option>
                  <option value="dll">.dll (Native internal)</option>
                  <option value="zip">.zip (Bundle)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '11.5px' }}>Binary SHA-256 Checksum</label>
              <input
                type="text"
                value={relSha256}
                onChange={(e) => setRelSha256(e.target.value)}
                className="form-control"
                placeholder="64-character SHA-256 hash"
                style={{ fontSize: '13px', padding: '10px', fontFamily: 'monospace' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ fontSize: '11.5px' }}>Release Changelog</label>
              <textarea
                value={relChangelog}
                onChange={(e) => setRelChangelog(e.target.value)}
                className="form-control"
                rows="3"
                placeholder="What's new in this build..."
                style={{ fontSize: '13px', padding: '10px' }}
              />
            </div>

            <button
              type="submit"
              disabled={relUploading}
              className="btn btn-primary"
              style={{ padding: '11px 24px', fontWeight: 700 }}
            >
              {relUploading ? 'Signing & Publishing…' : 'Publish & Sign Release →'}
            </button>
          </form>
        </div>
      )}

      {/* 4. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>System Audit Trail</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>User</th>
                  <th style={{ padding: '10px 12px' }}>IP Address</th>
                  <th style={{ padding: '10px 12px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-secondary" style={{ fontSize: '11px' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fff' }}>
                      {log.profiles?.username || log.profiles?.email || log.user_id?.substring(0, 8) || 'System'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
