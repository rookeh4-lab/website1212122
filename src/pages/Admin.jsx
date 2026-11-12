import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, copyText, API_BASE } from '../utils/api';

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products-releases');

  // Data states
  const [users, setUsers] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [token, setToken] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  // Products & Releases (Edit Everything) State
  const [adminProducts, setAdminProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [adminReleases, setAdminReleases] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingRelease, setEditingRelease] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileProduct, setUploadFileProduct] = useState('java-client');
  const [uploadFileVersion, setUploadFileVersion] = useState('2.2.0+1.21.11');
  const [uploadFileChangelog, setUploadFileChangelog] = useState('');
  const [uploadFileLoading, setUploadFileLoading] = useState(false);

  // License search & filter states
  const [licSearchQuery, setLicSearchQuery] = useState('');
  const [licStatusFilter, setLicStatusFilter] = useState('ALL');
  const [licProductFilter, setLicProductFilter] = useState('ALL');
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  // Single key form state
  const [newLicProduct, setNewLicProduct] = useState('cpp-client');
  const [newLicEmail, setNewLicEmail] = useState('');
  const [newLicDevices, setNewLicDevices] = useState(1);
  const [newLicTier, setNewLicTier] = useState('lifetime');
  const [newLicExpireDays, setNewLicExpireDays] = useState('');
  const [licCreating, setLicCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState('');

  // Bulk generation state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkCreatedKeys, setBulkCreatedKeys] = useState([]);
  const [copiedBulk, setCopiedBulk] = useState(false);

  // Release upload state
  const [relProduct, setRelProduct] = useState('cpp-client');
  const [relVersion, setRelVersion] = useState('1.2.0');
  const [relFileType, setRelFileType] = useState('exe');
  const [relSha256, setRelSha256] = useState('');
  const [relChangelog, setRelChangelog] = useState('');
  const [relUploading, setRelUploading] = useState(false);

  // HWID Reset Keys state
  const [resetKeys, setResetKeys] = useState([]);
  const [loadingResetKeys, setLoadingResetKeys] = useState(false);
  const [genResetCount, setGenResetCount] = useState(1);
  const [genResetNote, setGenResetNote] = useState('');
  const [generatingResetKey, setGeneratingResetKey] = useState(false);
  const [copiedResetKey, setCopiedResetKey] = useState('');

  // Free Trial Program settings state
  const [trialSettings, setTrialSettings] = useState({
    on_hold: true,
    hold_message: 'Free trials are temporarily on hold while updates are being finalized.',
  });
  const [savingTrialSettings, setSavingTrialSettings] = useState(false);

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
        const isOwner = profileData.user?.email === 'rookeh4@gmail.com';
        if (profileData.role !== 'admin' && profileData.user.role !== 'admin' && !isOwner) {
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);
        const curToken = await auth.getToken();
        setToken(curToken);
        await Promise.all([
          loadAdminData(curToken),
          loadLicenses(curToken),
          loadResetKeys(curToken),
          loadAdminProducts(curToken),
          loadAdminReleases(curToken),
        ]);
      } catch (err) {
        console.error('Admin check failed:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    checkAdmin();
    return () => { active = false; };
  }, [navigate]);

  const adminHeaders = (t, json = false) => {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    const activeToken = t || token;
    if (activeToken) h.Authorization = `Bearer ${activeToken}`;
    return h;
  };

  const loadAdminData = async (t) => {
    try {
      const [uRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { credentials: 'include', headers: adminHeaders(t) }),
        fetch(`${API_BASE}/admin/audit-logs`, { credentials: 'include', headers: adminHeaders(t) }),
      ]);
      const [uData, aData] = await Promise.all([uRes.json(), aRes.json()]);
      if (uData.users) setUsers(uData.users);
      if (aData.logs) setAuditLogs(aData.logs);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  const loadAdminProducts = async (t) => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/admin/products`, {
        credentials: 'include',
        headers: adminHeaders(t),
      });
      const data = await res.json();
      if (data.success && data.products) {
        setAdminProducts(data.products);
        if (data.settings?.trials) {
          setTrialSettings({
            on_hold: data.settings.trials.on_hold !== undefined ? Boolean(data.settings.trials.on_hold) : true,
            hold_message: data.settings.trials.hold_message || 'Free trials are temporarily on hold while updates are being finalized.',
          });
        }
      }
    } catch (err) {
      console.error('Failed to load admin products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadAdminReleases = async (t) => {
    setLoadingReleases(true);
    try {
      const res = await fetch(`${API_BASE}/admin/releases`, {
        credentials: 'include',
        headers: adminHeaders(t),
      });
      const data = await res.json();
      if (data.success && data.releases) {
        setAdminReleases(data.releases);
      }
    } catch (err) {
      console.error('Failed to load admin releases:', err);
    } finally {
      setLoadingReleases(false);
    }
  };

  const handleToggleProductHold = async (prodId, currentOnHold, prodTitle) => {
    try {
      const res = await fetch(`${API_BASE}/admin/products/${prodId}/toggle-hold`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          text: `Product '${prodTitle}' is now ${data.on_hold ? 'ON HOLD' : 'ACTIVE'}!`,
          type: 'success',
        });
        loadAdminProducts(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to toggle hold status', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error toggling hold status', type: 'danger' });
    }
  };

  const handleToggleTrialHold = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/trials/toggle-hold`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({
          text: `Free trials are now ${data.on_hold ? 'ON HOLD (Claims Paused)' : 'ACTIVE (Claims Open)'}!`,
          type: 'success',
        });
        setTrialSettings({
          on_hold: data.on_hold,
          hold_message: data.hold_message || '',
        });
      } else {
        setStatusMsg({ text: data.error || 'Failed to toggle trial hold status', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error toggling trial hold status', type: 'danger' });
    }
  };

  const handleSaveTrialSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingTrialSettings(true);
    try {
      const res = await fetch(`${API_BASE}/admin/trials/settings`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify(trialSettings),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: 'Free trial program settings saved successfully!', type: 'success' });
      } else {
        setStatusMsg({ text: data.error || 'Failed to save trial settings', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error saving trial settings', type: 'danger' });
    } finally {
      setSavingTrialSettings(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const res = await fetch(`${API_BASE}/admin/products/${editingProduct.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify(editingProduct),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Product '${editingProduct.name}' updated successfully!`, type: 'success' });
        setEditingProduct(null);
        loadAdminProducts(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to save product', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error saving product', type: 'danger' });
    }
  };

  const handleToggleReleaseActive = async (relId) => {
    try {
      const res = await fetch(`${API_BASE}/admin/releases/${relId}/toggle-active`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Release active status toggled (${data.is_active ? 'ACTIVE' : 'INACTIVE'})`, type: 'success' });
        loadAdminReleases(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to toggle release active', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error toggling release active status', type: 'danger' });
    }
  };

  const handleSaveRelease = async (e) => {
    e.preventDefault();
    if (!editingRelease) return;
    try {
      const res = await fetch(`${API_BASE}/admin/releases/${editingRelease.id}/edit`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify(editingRelease),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Release ${editingRelease.version} updated & re-signed with Ed25519!`, type: 'success' });
        setEditingRelease(null);
        loadAdminReleases(token);
        loadAdminProducts(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to edit release', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error editing release', type: 'danger' });
    }
  };

  const handleDeleteRelease = async (relId, version) => {
    if (!window.confirm(`Are you sure you want to delete release ${version}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/releases/${relId}/delete`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Release ${version} deleted`, type: 'success' });
        loadAdminReleases(token);
        loadAdminProducts(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to delete release', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error deleting release', type: 'danger' });
    }
  };

  const handleUploadJarOrBinary = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setStatusMsg({ text: 'Please select a .jar or .exe file to upload', type: 'danger' });
      return;
    }
    setUploadFileLoading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1];
          const res = await fetch(`${API_BASE}/admin/releases/upload-file`, {
            method: 'POST',
            credentials: 'include',
            headers: adminHeaders(token, true),
            body: JSON.stringify({
              filename: uploadFile.name,
              base64Data,
              product_slug: uploadFileProduct,
              version: uploadFileVersion.trim(),
              changelog: uploadFileChangelog.trim(),
              set_active: true,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setStatusMsg({
              text: `Successfully uploaded ${uploadFile.name} (SHA-256: ${data.sha256.substring(0, 16)}...) and registered release!`,
              type: 'success',
            });
            setUploadFile(null);
            setUploadFileChangelog('');
            await Promise.all([loadAdminReleases(token), loadAdminProducts(token)]);
          } else {
            setStatusMsg({ text: data.error || 'Upload failed', type: 'danger' });
          }
        } catch {
          setStatusMsg({ text: 'Error processing file data', type: 'danger' });
        } finally {
          setUploadFileLoading(false);
        }
      };
      reader.readAsDataURL(uploadFile);
    } catch {
      setStatusMsg({ text: 'Failed to read upload file', type: 'danger' });
      setUploadFileLoading(false);
    }
  };

  const loadResetKeys = async (t) => {
    setLoadingResetKeys(true);
    try {
      const res = await fetch(`${API_BASE}/admin/hwid-reset-keys`, {
        credentials: 'include',
        headers: adminHeaders(t),
      });
      const data = await res.json();
      if (data.success && data.keys) {
        setResetKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to load reset keys:', err);
    } finally {
      setLoadingResetKeys(false);
    }
  };

  const handleGenerateResetKeys = async (e) => {
    e?.preventDefault();
    setGeneratingResetKey(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const res = await fetch(`${API_BASE}/admin/hwid-reset-keys/create`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({ count: genResetCount, note: genResetNote }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Successfully generated ${data.count} HWID Reset Key(s)!`, type: 'success' });
        loadResetKeys(token);
        setGenResetNote('');
      } else {
        setStatusMsg({ text: data.error || 'Failed to generate reset keys', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error generating reset keys', type: 'danger' });
    } finally {
      setGeneratingResetKey(false);
    }
  };

  const handleRevokeResetKey = async (id, key) => {
    if (!window.confirm(`Are you sure you want to revoke reset key ${key}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/hwid-reset-keys/revoke`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({ id, resetKey: key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: `Revoked reset key ${key}`, type: 'success' });
        loadResetKeys(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to revoke key', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error revoking key', type: 'danger' });
    }
  };

  const loadLicenses = async (t, query = licSearchQuery, status = licStatusFilter, prod = licProductFilter) => {
    setLoadingLicenses(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (status && status !== 'ALL') params.set('status', status);
      if (prod && prod !== 'ALL') params.set('product', prod);

      const res = await fetch(`${API_BASE}/admin/licenses?${params.toString()}`, {
        credentials: 'include',
        headers: adminHeaders(t),
      });
      const data = await res.json();
      if (data.success && data.licenses) {
        setLicenses(data.licenses);
      }
    } catch (err) {
      console.error('Failed to load licenses:', err);
    } finally {
      setLoadingLicenses(false);
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    setLicCreating(true);
    setStatusMsg({ text: '', type: '' });
    try {
      let expires_at = null;
      if (newLicExpireDays && parseInt(newLicExpireDays, 10) > 0) {
        expires_at = new Date(Date.now() + parseInt(newLicExpireDays, 10) * 86400000).toISOString();
      }

      const res = await fetch(`${API_BASE}/admin/licenses/create`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          product_slug: newLicProduct,
          customer_email: newLicEmail.trim() || null,
          max_devices: parseInt(newLicDevices, 10),
          license_type: newLicTier,
          expires_at,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedKey(data.license.license_key);
        setStatusMsg({ text: `Generated Key: ${data.license.license_key}`, type: 'success' });
        await loadLicenses(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to create license', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error connecting to admin licensing service', type: 'danger' });
    } finally {
      setLicCreating(false);
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    setBulkCreating(true);
    setStatusMsg({ text: '', type: '' });
    setBulkCreatedKeys([]);

    try {
      const res = await fetch(`${API_BASE}/admin/licenses/bulk`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          count: parseInt(bulkCount, 10),
          product_slug: newLicProduct,
          max_devices: parseInt(newLicDevices, 10),
          license_type: newLicTier,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.keys) {
        setBulkCreatedKeys(data.keys);
        setStatusMsg({ text: `Successfully generated ${data.count} keys in bulk!`, type: 'success' });
        await loadLicenses(token);
      } else {
        setStatusMsg({ text: data.error || 'Failed to generate bulk keys', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Error executing bulk generation', type: 'danger' });
    } finally {
      setBulkCreating(false);
    }
  };

  const handleLicenseAction = async (licenseId, action, confirmPrompt = '') => {
    if (confirmPrompt && !window.confirm(confirmPrompt)) return;
    try {
      const res = await fetch(`${API_BASE}/admin/licenses/action`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({ license_id: licenseId, action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message || 'Action executed successfully', type: 'success' });
        await loadLicenses(token);
      } else {
        setStatusMsg({ text: data.error || 'Action failed', type: 'danger' });
      }
    } catch {
      setStatusMsg({ text: 'Network error executing action', type: 'danger' });
    }
  };

  const handleBanUser = async (userId, currentBanned) => {
    const reason = window.prompt(currentBanned ? 'Unban reason:' : 'Reason for suspension:', 'Terms violation');
    if (reason === null) return;
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
        method: 'POST',
        credentials: 'include',
        headers: adminHeaders(token, true),
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
        credentials: 'include',
        headers: adminHeaders(token, true),
        body: JSON.stringify({
          product_slug: relProduct,
          version: relVersion.trim(),
          file_type: relFileType,
          sha256: relSha256.trim() || null,
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

  const copyBulkKeys = () => {
    copyText(bulkCreatedKeys.join('\n'));
    setCopiedBulk(true);
    setTimeout(() => setCopiedBulk(false), 2000);
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
    <div className="container" style={{ maxWidth: '1180px', padding: '40px 20px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '8px' }}>
            Super Admin Portal
          </span>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '4px 0 0' }}>
            5.55 License & Platform Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Generate keys, manage customer entitlements, inspect HWID devices, and revoke licenses.
          </p>
        </div>
        <button
          onClick={() => {
            loadAdminData(token);
            loadLicenses(token);
            loadResetKeys(token);
            loadAdminProducts(token);
            loadAdminReleases(token);
          }}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px 16px' }}
        >
          🔄 Refresh Live Data
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
          { id: 'products-releases', label: `🎮 Products & Releases (${adminProducts.length} Prods / ${adminReleases.length} Rels)` },
          { id: 'license-mgmt', label: `License Management (${licenses.length})` },
          { id: 'hwid-keys', label: `HWID Reset Keys (${resetKeys.length})` },
          { id: 'users', label: `Users (${users.length})` },
          { id: 'audit', label: `Audit Trail (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 18px',
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

      {/* 0. PRODUCTS & RELEASES MANAGEMENT (EDIT EVERYTHING) */}
      {activeTab === 'products-releases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Section 1: Product Catalog & Hold Controls */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Client Product Catalog & Hold Controls
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Put clients on hold, manage public availability, and edit client branding and details.
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadAdminProducts(token)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 14px' }}
              >
                🔄 Refresh Products
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {adminProducts.map((p) => {
                const isOnHold = Boolean(p.on_hold);
                return (
                  <div
                    key={p.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: `1px solid ${isOnHold ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.3)'}`,
                      borderRadius: '12px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: p.slug === 'cpp-client' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                            color: p.slug === 'cpp-client' ? '#22d3ee' : '#c084fc',
                            border: `1px solid ${p.slug === 'cpp-client' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                          }}
                        >
                          {p.platform?.toUpperCase() || 'CLIENT'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: isOnHold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            color: isOnHold ? '#fbbf24' : '#4ade80',
                            border: `1px solid ${isOnHold ? 'rgba(245, 158, 11, 0.35)' : 'rgba(34, 197, 94, 0.35)'}`,
                          }}
                        >
                          {isOnHold ? '⏸ ON HOLD' : '● ACTIVE'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#ffffff', margin: '0 0 6px' }}>
                        {p.name}
                      </h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
                        {p.description}
                      </p>

                      <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px' }}>
                        <div><strong style={{ color: '#94a3b8' }}>Slug:</strong> <code style={{ color: '#ffffff' }}>{p.slug}</code></div>
                        <div><strong style={{ color: '#94a3b8' }}>Price:</strong> ${p.price_usd} USD</div>
                        <div><strong style={{ color: '#94a3b8' }}>Active Release:</strong> {p.active_version ? <span style={{ color: '#38bdf8', fontWeight: 600 }}>v{p.active_version} ({p.active_storage_path})</span> : <span style={{ color: '#71717a' }}>None active</span>}</div>
                        {isOnHold && p.hold_message && (
                          <div style={{ color: '#fbbf24', marginTop: '2px', fontSize: '11.5px', fontStyle: 'italic' }}>
                            Notice: "{p.hold_message}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleProductHold(p.id, isOnHold, p.name)}
                        className="btn btn-sm"
                        style={{
                          padding: '7px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          flex: 1,
                          background: isOnHold ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: isOnHold ? '#4ade80' : '#fbbf24',
                          border: `1px solid ${isOnHold ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                          cursor: 'pointer',
                        }}
                      >
                        {isOnHold ? '▶ Release from Hold' : '⏸ Put on Hold'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...p })}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '7px 14px', fontSize: '12px', fontWeight: 600 }}
                      >
                        ✏ Edit Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Free Trial Program & Hold Controls */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: `1px solid ${trialSettings.on_hold ? 'rgba(245, 158, 11, 0.4)' : 'rgba(34, 197, 94, 0.3)'}`,
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                    3-Day Free Trial Program
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      background: trialSettings.on_hold ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      color: trialSettings.on_hold ? '#fbbf24' : '#4ade80',
                      border: `1px solid ${trialSettings.on_hold ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                    }}
                  >
                    {trialSettings.on_hold ? '⏸ ON HOLD (Claims Paused)' : '🟢 ACTIVE (Claims Open)'}
                  </span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Control public 3-day automated free trial claims without restarting servers.
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleTrialHold}
                className="btn btn-sm"
                style={{
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  background: trialSettings.on_hold ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: trialSettings.on_hold ? '#4ade80' : '#fbbf24',
                  border: `1px solid ${trialSettings.on_hold ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  cursor: 'pointer',
                }}
              >
                {trialSettings.on_hold ? '▶ Resume Free Trials' : '⏸ Put Free Trials On Hold'}
              </button>
            </div>

            <form onSubmit={handleSaveTrialSettings} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <label className="form-label" style={{ fontSize: '11.5px', marginBottom: '6px' }}>
                  Notice Shown to Users While On Hold
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={trialSettings.hold_message || ''}
                  onChange={(e) => setTrialSettings({ ...trialSettings, hold_message: e.target.value })}
                  placeholder="e.g. Free trials are temporarily on hold while updates are being finalized."
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                />
              </div>
              <button
                type="submit"
                disabled={savingTrialSettings}
                className="btn btn-secondary btn-sm"
                style={{ padding: '9px 18px', fontSize: '12.5px', fontWeight: 600, height: '39px' }}
              >
                {savingTrialSettings ? 'Saving...' : '💾 Save Notice'}
              </button>
            </form>
          </div>

          {/* Section 2: Upload / Replace Client File (JAR / EXE) */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
              Upload & Replace Client File (.jar / .exe)
            </h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Directly upload client binaries to Supabase Storage. Automatically generates SHA-256 and Ed25519 signatures.
            </div>

            <form onSubmit={handleUploadJarOrBinary}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Target Product</label>
                  <select
                    value={uploadFileProduct}
                    onChange={(e) => setUploadFileProduct(e.target.value)}
                    className="form-control"
                    style={{ padding: '10px', fontSize: '13px' }}
                  >
                    <option value="java-client">5.55 Java Client (.JAR package)</option>
                    <option value="cpp-client">5.55 C++ Client (.EXE loader)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Version Tag</label>
                  <input
                    type="text"
                    value={uploadFileVersion}
                    onChange={(e) => setUploadFileVersion(e.target.value)}
                    className="form-control"
                    placeholder="e.g. 2.2.0+1.21.11"
                    style={{ padding: '10px', fontSize: '13px' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Select Client File (.jar / .exe)</label>
                  <input
                    type="file"
                    accept=".jar,.exe,.dll,.zip"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="form-control"
                    style={{ padding: '8px', fontSize: '12px' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Changelog / Release Notes</label>
                <textarea
                  value={uploadFileChangelog}
                  onChange={(e) => setUploadFileChangelog(e.target.value)}
                  className="form-control"
                  rows="2"
                  placeholder="e.g. Fabric 1.21.11 ClickGUI update, new PvP modules, enhanced HWID sync"
                  style={{ padding: '10px', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                disabled={uploadFileLoading || !uploadFile}
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: 700 }}
              >
                {uploadFileLoading ? 'Uploading & Signing Release…' : 'Upload File & Publish Signed Release →'}
              </button>
            </form>
          </div>

          {/* Section 3: All Client Releases & Binary Manifests Table (Edit Everything) */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Active Releases & Signed Manifests ({adminReleases.length})
                </h2>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Edit JAR storage paths, version strings, SHA-256 hashes, changelogs, and cryptographic signatures.
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadAdminReleases(token)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '6px 14px' }}
              >
                🔄 Refresh Releases
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>Product</th>
                    <th style={{ padding: '10px 12px' }}>Version</th>
                    <th style={{ padding: '10px 12px' }}>Type</th>
                    <th style={{ padding: '10px 12px' }}>Storage Path / JAR Name</th>
                    <th style={{ padding: '10px 12px' }}>SHA-256 Hash</th>
                    <th style={{ padding: '10px 12px' }}>State</th>
                    <th style={{ padding: '10px 12px' }}>Created</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReleases ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading release manifests...
                      </td>
                    </tr>
                  ) : adminReleases.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No releases found in database.
                      </td>
                    </tr>
                  ) : (
                    adminReleases.map((r) => {
                      const isCpp = r.products?.slug === 'cpp-client';
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: isCpp ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                                color: isCpp ? '#22d3ee' : '#c084fc',
                                border: `1px solid ${isCpp ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                              }}
                            >
                              {r.products?.name || r.products?.slug || '5.55 Client'}
                            </span>
                          </td>

                          <td style={{ padding: '12px', fontWeight: 700, color: '#ffffff' }}>
                            v{r.version}
                          </td>

                          <td style={{ padding: '12px' }}>
                            <span style={{ textTransform: 'uppercase', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                              {r.file_type}
                            </span>
                          </td>

                          <td style={{ padding: '12px', fontFamily: 'monospace', color: '#e2e8f0', fontSize: '12px' }}>
                            {r.storage_path}
                          </td>

                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontFamily: 'monospace', color: '#a5f3fc', fontSize: '11px' }}>
                                {r.sha256 ? `${r.sha256.substring(0, 14)}…` : '—'}
                              </span>
                              {r.sha256 && (
                                <button
                                  type="button"
                                  onClick={() => copyText(r.sha256)}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', fontSize: '11px' }}
                                  title="Copy SHA-256"
                                >
                                  📋
                                </button>
                              )}
                            </div>
                          </td>

                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: r.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                                color: r.is_active ? '#4ade80' : '#94a3b8',
                                border: `1px solid ${r.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                              }}
                            >
                              {r.is_active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </td>

                          <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '11.5px' }}>
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>

                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => setEditingRelease({ ...r })}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600 }}
                              >
                                ✏ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleReleaseActive(r.id)}
                                className="btn btn-sm"
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: r.is_active ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                  color: r.is_active ? '#fbbf24' : '#4ade80',
                                  border: `1px solid ${r.is_active ? 'rgba(245, 158, 11, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                }}
                              >
                                {r.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRelease(r.id, r.version)}
                                className="btn btn-sm"
                                style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              >
                                🗑
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 1. LICENSE MANAGEMENT TAB */}
      {activeTab === 'license-mgmt' && (
        <div>
          {/* Key Generator Accordion Card */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              marginBottom: '28px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Generate License Keys
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Create authentic Base32 keys in standard format (555C-XXXX-XXXX-XXXX for C++, 555J-XXXX-XXXX-XXXX for Java).
                </div>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setBulkMode(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: !bulkMode ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                  }}
                >
                  Single Key
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode(true)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: bulkMode ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                  }}
                >
                  Bulk Generation
                </button>
              </div>
            </div>

            {/* Single Key Form */}
            {!bulkMode ? (
              <form onSubmit={handleCreateLicense}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Product Type</label>
                    <select
                      value={newLicProduct}
                      onChange={(e) => setNewLicProduct(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="cpp-client">555_CPP — 5.55 C++ Client (555C-XXXX...)</option>
                      <option value="java-client">555_JAVA — 5.55 Java Client (555J-XXXX...)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Assign Customer Email (Optional)</label>
                    <input
                      type="email"
                      value={newLicEmail}
                      onChange={(e) => setNewLicEmail(e.target.value)}
                      className="form-control"
                      placeholder="buyer@example.com"
                      style={{ padding: '10px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Max Devices (HWID limit)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newLicDevices}
                      onChange={(e) => setNewLicDevices(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>License Tier</label>
                    <select
                      value={newLicTier}
                      onChange={(e) => setNewLicTier(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="lifetime">Lifetime</option>
                      <option value="subscription">Subscription</option>
                      <option value="trial">Trial</option>
                    </select>
                  </div>

                  {newLicTier === 'subscription' && (
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '11.5px' }}>Expire in Days</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="30"
                        value={newLicExpireDays}
                        onChange={(e) => setNewLicExpireDays(e.target.value)}
                        className="form-control"
                        style={{ padding: '10px' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={licCreating}
                    className="btn btn-primary"
                    style={{ padding: '11px 24px', fontWeight: 700 }}
                  >
                    {licCreating ? 'Generating Key…' : 'Generate License Key →'}
                  </button>

                  {createdKey && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.5)', padding: '8px 14px', borderRadius: '8px', border: '1px solid #10b981' }}>
                      <span style={{ fontFamily: 'monospace', color: '#6ee7b7', fontWeight: 700 }}>{createdKey}</span>
                      <button
                        type="button"
                        onClick={() => copyText(createdKey)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '11px' }}
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </form>
            ) : (
              /* Bulk Generation Form */
              <form onSubmit={handleBulkGenerate}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Product Type</label>
                    <select
                      value={newLicProduct}
                      onChange={(e) => setNewLicProduct(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="cpp-client">555_CPP — 5.55 C++ Client (555C-XXXX...)</option>
                      <option value="java-client">555_JAVA — 5.55 Java Client (555J-XXXX...)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Quantity to Generate (1 to 50)</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={bulkCount}
                      onChange={(e) => setBulkCount(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Max Devices per Key</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={newLicDevices}
                      onChange={(e) => setNewLicDevices(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11.5px' }}>Tier</label>
                    <select
                      value={newLicTier}
                      onChange={(e) => setNewLicTier(e.target.value)}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="lifetime">Lifetime</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    type="submit"
                    disabled={bulkCreating}
                    className="btn btn-primary"
                    style={{ padding: '11px 24px', fontWeight: 700 }}
                  >
                    {bulkCreating ? `Generating ${bulkCount} Keys…` : `Generate ${bulkCount} Keys in Bulk →`}
                  </button>

                  {bulkCreatedKeys.length > 0 && (
                    <button
                      type="button"
                      onClick={copyBulkKeys}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '10px 16px', fontWeight: 700 }}
                    >
                      {copiedBulk ? '✓ All Keys Copied!' : `📋 Copy All (${bulkCreatedKeys.length}) Keys`}
                    </button>
                  )}
                </div>

                {bulkCreatedKeys.length > 0 && (
                  <div
                    style={{
                      marginTop: '16px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      borderRadius: '10px',
                      padding: '14px',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: '#a5f3fc',
                      lineHeight: 1.6,
                    }}
                  >
                    {bulkCreatedKeys.map((k, i) => (
                      <div key={i}>{k}</div>
                    ))}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Search, Filter & Live License Directory */}
          <div
            className="card"
            style={{
              padding: '24px 28px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Active License Database ({licenses.length})
                </h2>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Inspect registered hardware, key states, customer bindings, and execute administrative actions.
                </div>
              </div>

              {/* Status Filter Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['ALL', 'ACTIVE', 'UNUSED', 'EXPIRED', 'REVOKED', 'SUSPENDED'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setLicStatusFilter(st);
                      loadLicenses(token, licSearchQuery, st, licProductFilter);
                    }}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: licStatusFilter === st ? 'var(--primary)' : 'rgba(255, 255, 255, 0.06)',
                      color: licStatusFilter === st ? '#fff' : 'var(--text-muted)',
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                value={licSearchQuery}
                onChange={(e) => setLicSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadLicenses(token, licSearchQuery, licStatusFilter, licProductFilter); }}
                placeholder="Search by license key (555C-...), customer email, or SellAuth invoice ID..."
                className="form-control"
                style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={() => loadLicenses(token, licSearchQuery, licStatusFilter, licProductFilter)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '10px 18px' }}
              >
                Search
              </button>
            </div>

            {/* License Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px' }}>License Key</th>
                    <th style={{ padding: '10px 12px' }}>Product</th>
                    <th style={{ padding: '10px 12px' }}>State</th>
                    <th style={{ padding: '10px 12px' }}>Devices</th>
                    <th style={{ padding: '10px 12px' }}>Customer / Order</th>
                    <th style={{ padding: '10px 12px' }}>Created</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((lic) => {
                    const st = lic.key_state || (lic.status === 'active' ? 'ACTIVE' : lic.status.toUpperCase());
                    const stateColor =
                      st === 'ACTIVE' ? '#10b981' :
                      st === 'UNUSED' ? '#38bdf8' :
                      st === 'SUSPENDED' ? '#f59e0b' :
                      st === 'EXPIRED' ? '#94a3b8' : '#ef4444';

                    const isCpp = lic.products?.slug === 'cpp-client';

                    return (
                      <tr key={lic.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', color: '#ffffff', fontWeight: 700, fontSize: '13.5px' }}>
                              {lic.license_key}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyText(lic.license_key)}
                              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', fontSize: '11px' }}
                              title="Copy Key"
                            >
                              📋
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isCpp ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                              color: isCpp ? '#22d3ee' : '#c084fc',
                              border: `1px solid ${isCpp ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)'}`,
                            }}
                          >
                            {isCpp ? '555 C++ Client' : '555 Java Client'}
                          </span>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: `${stateColor}22`,
                              color: stateColor,
                              border: `1px solid ${stateColor}44`,
                            }}
                          >
                            {st}
                          </span>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <span style={{ color: lic.device_count > 0 ? '#10b981' : 'var(--text-muted)' }}>
                            {lic.device_count} / {lic.max_devices || 1}
                          </span>
                        </td>

                        <td style={{ padding: '12px' }}>
                          <div style={{ color: '#e2e8f0', fontSize: '12px' }}>{lic.customer_email}</div>
                          {lic.metadata?.sellauth_invoice_id && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              Invoice: {lic.metadata.sellauth_invoice_id}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                          {new Date(lic.created_at).toLocaleDateString()}
                        </td>

                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {/* Reset Devices Button */}
                            {lic.device_count > 0 && (
                              <button
                                type="button"
                                onClick={() => handleLicenseAction(lic.id, 'reset-devices', `Reset all registered hardware devices for ${lic.license_key}?`)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#38bdf8' }}
                                title="Unbind all registered devices"
                              >
                                Reset HWID
                              </button>
                            )}

                            {/* Suspend / Reactivate */}
                            {st === 'SUSPENDED' ? (
                              <button
                                type="button"
                                onClick={() => handleLicenseAction(lic.id, 'unsuspend')}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#10b981' }}
                              >
                                Unsuspend
                              </button>
                            ) : st !== 'REVOKED' && (
                              <button
                                type="button"
                                onClick={() => handleLicenseAction(lic.id, 'suspend')}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#f59e0b' }}
                              >
                                Suspend
                              </button>
                            )}

                            {/* Revoke */}
                            {st !== 'REVOKED' && (
                              <button
                                type="button"
                                onClick={() => handleLicenseAction(lic.id, 'revoke', `Permanently revoke license ${lic.license_key}? This cannot be undone.`)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {licenses.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        {loadingLicenses ? 'Searching database...' : 'No licenses found matching your filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. USERS TAB */}
      {activeTab === 'users' && (
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Registered Website Accounts</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '10px 12px' }}>Email / Username</th>
                  <th style={{ padding: '10px 12px' }}>Role</th>
                  <th style={{ padding: '10px 12px' }}>Licenses</th>
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
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${u.banned_at ? 'badge-danger' : 'badge-success'}`}>
                        {u.banned_at ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleBanUser(u.id, !!u.banned_at)}
                        className={`btn btn-sm ${u.banned_at ? 'btn-secondary' : 'btn-danger'}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                      >
                        {u.banned_at ? 'Reactivate' : 'Suspend'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HWID RESET KEYS MANAGEMENT TAB */}
      {activeTab === 'hwid-keys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Generator Card */}
          <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '8px' }}>
              🔑 Generate Single-Use HWID Reset Keys
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Issue single-use HWID reset keys for users requesting a PC transfer. When the user enters this key in their dashboard, their hardware unbinds instantly and allows activation on a new machine.
            </p>

            <form onSubmit={handleGenerateResetKeys} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Quantity</label>
                <select
                  value={genResetCount}
                  onChange={(e) => setGenResetCount(parseInt(e.target.value, 10))}
                  className="form-control"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                >
                  <option value={1}>1 Key</option>
                  <option value={3}>3 Keys</option>
                  <option value={5}>5 Keys</option>
                  <option value={10}>10 Keys</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600 }}>Internal Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Discord Ticket #1042 / Staff issue"
                  value={genResetNote}
                  onChange={(e) => setGenResetNote(e.target.value)}
                  className="form-control"
                  style={{ padding: '9px 12px', fontSize: '13px' }}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={generatingResetKey}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 700, width: '100%' }}
                >
                  {generatingResetKey ? 'Generating...' : '+ Generate Reset Key(s)'}
                </button>
              </div>
            </form>
          </div>

          {/* Reset Keys Table Card */}
          <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', color: '#fff', margin: 0 }}>
                Issued Reset Keys Database ({resetKeys.length})
              </h2>
              <button
                onClick={() => loadResetKeys(token)}
                className="btn btn-secondary btn-sm"
              >
                🔄 Refresh Keys
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                    <th style={{ padding: '10px 12px' }}>Reset Key</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Created Date</th>
                    <th style={{ padding: '10px 12px' }}>Created By</th>
                    <th style={{ padding: '10px 12px' }}>Redeemed By</th>
                    <th style={{ padding: '10px 12px' }}>Redeemed At</th>
                    <th style={{ padding: '10px 12px' }}>Note</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingResetKeys ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading issued reset keys...
                      </td>
                    </tr>
                  ) : resetKeys.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No HWID reset keys created yet. Generate one above to issue to a user.
                      </td>
                    </tr>
                  ) : (
                    resetKeys.map((k) => (
                      <tr key={k.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#fff' }}>
                          <span style={{ background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px' }}>
                            {k.reset_key}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: '11px',
                              background: k.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : (k.status === 'used' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
                              color: k.status === 'active' ? '#4ade80' : (k.status === 'used' ? '#38bdf8' : '#f87171'),
                              border: `1px solid ${k.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : (k.status === 'used' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(239, 68, 68, 0.3)')}`,
                            }}
                          >
                            {k.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>
                          {new Date(k.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>
                          {k.created_by}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                          {k.used_by_email || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>
                          {k.used_at ? new Date(k.used_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {k.note || '—'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                copyText(k.reset_key);
                                setCopiedResetKey(k.reset_key);
                                setTimeout(() => setCopiedResetKey(''), 1500);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                            >
                              {copiedResetKey === k.reset_key ? '✓ Copied' : 'Copy'}
                            </button>
                            {k.status === 'active' && (
                              <button
                                onClick={() => handleRevokeResetKey(k.id, k.reset_key)}
                                className="btn btn-sm"
                                style={{ padding: '4px 10px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px' }}>Platform Security Audit Trail</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                  <th style={{ padding: '10px 12px' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px' }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Entity</th>
                  <th style={{ padding: '10px 12px' }}>IP Address</th>
                  <th style={{ padding: '10px 12px' }}>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                      {log.entity_type} {log.entity_id ? `(${log.entity_id.substring(0, 8)}…)` : ''}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT */}
      {editingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingProduct(null); }}
        >
          <div
            className="card"
            style={{
              maxWidth: '560px',
              width: '100%',
              background: '#0e0b19',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0 }}>
                Edit Product: {editingProduct.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Product Name</label>
                  <input
                    type="text"
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="form-control"
                    style={{ padding: '10px' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Platform</label>
                    <select
                      value={editingProduct.platform || 'fabric'}
                      onChange={(e) => setEditingProduct({ ...editingProduct, platform: e.target.value })}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="fabric">Fabric (Java Client)</option>
                      <option value="native">Native C++ (Injection)</option>
                      <option value="external">External Utility</option>
                      <option value="both">Both</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingProduct.price_usd || 0}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price_usd: parseFloat(e.target.value) })}
                      className="form-control"
                      style={{ padding: '10px' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Description</label>
                  <textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="form-control"
                    rows="3"
                    style={{ padding: '10px', resize: 'vertical' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Custom On-Hold Notice Message</label>
                  <input
                    type="text"
                    value={editingProduct.hold_message || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, hold_message: e.target.value })}
                    className="form-control"
                    placeholder="e.g. 5.55 Injection is on hold while updates are finalized."
                    style={{ padding: '10px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#fbbf24', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingProduct.on_hold)}
                      onChange={(e) => setEditingProduct({ ...editingProduct, on_hold: e.target.checked })}
                    />
                    Put Product On Hold (Pauses downloads & alerts users)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '9px 24px', fontWeight: 700 }}
                >
                  Save Product Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RELEASE */}
      {editingRelease && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingRelease(null); }}
        >
          <div
            className="card"
            style={{
              maxWidth: '620px',
              width: '100%',
              background: '#0e0b19',
              border: '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#fff', margin: 0 }}>
                  Edit Release: v{editingRelease.version}
                </h2>
                <div style={{ fontSize: '12px', color: '#c084fc', marginTop: '3px' }}>
                  {editingRelease.products?.name || editingRelease.products?.slug}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRelease(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRelease}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Version Tag</label>
                    <input
                      type="text"
                      value={editingRelease.version || ''}
                      onChange={(e) => setEditingRelease({ ...editingRelease, version: e.target.value })}
                      className="form-control"
                      style={{ padding: '10px' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '12px' }}>Binary Type</label>
                    <select
                      value={editingRelease.file_type || 'jar'}
                      onChange={(e) => setEditingRelease({ ...editingRelease, file_type: e.target.value })}
                      className="form-control"
                      style={{ padding: '10px' }}
                    >
                      <option value="jar">JAR</option>
                      <option value="exe">EXE</option>
                      <option value="dll">DLL</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Storage Path / JAR Filename in Bucket</label>
                  <input
                    type="text"
                    value={editingRelease.storage_path || ''}
                    onChange={(e) => setEditingRelease({ ...editingRelease, storage_path: e.target.value })}
                    className="form-control"
                    placeholder="e.g. CrosshairAddons-2.2.0+1.21.11.jar"
                    style={{ padding: '10px', fontFamily: 'monospace' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>SHA-256 Hash</label>
                  <input
                    type="text"
                    value={editingRelease.sha256 || ''}
                    onChange={(e) => setEditingRelease({ ...editingRelease, sha256: e.target.value })}
                    className="form-control"
                    placeholder="64-char hexadecimal hash"
                    style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '12px' }}>Changelog / Release Notes</label>
                  <textarea
                    value={editingRelease.changelog || ''}
                    onChange={(e) => setEditingRelease({ ...editingRelease, changelog: e.target.value })}
                    className="form-control"
                    rows="3"
                    style={{ padding: '10px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#4ade80', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={Boolean(editingRelease.is_active)}
                      onChange={(e) => setEditingRelease({ ...editingRelease, is_active: e.target.checked })}
                    />
                    Active Release (Users download this release)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setEditingRelease(null)}
                  className="btn btn-secondary"
                  style={{ padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '9px 24px', fontWeight: 700 }}
                >
                  Save & Re-Sign Ed25519 →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
