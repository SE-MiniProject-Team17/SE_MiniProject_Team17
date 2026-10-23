import { useEffect, useState } from 'react';
import apiError from '../api/client';
import {
  getMyMaterials,
  getSharedMaterials,
  uploadMaterial,
  getMaterial,
  downloadMaterial,
  shareMaterial,
  revokeMaterialShare,
} from '../api/materials';

function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function messageFrom(error) {
  if (typeof apiError === 'function') {
    const result = apiError(error);
    if (result?.message) return result.message;
  }
  return error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.';
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [sharedMaterials, setSharedMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [shareEmails, setShareEmails] = useState({});
  const [shares, setShares] = useState([]);

  async function refreshMaterials() {
    setLoading(true);
    try {
      const [ownMaterials, shared] = await Promise.all([
        getMyMaterials(),
        getSharedMaterials(),
      ]);
      setMaterials(ownMaterials);
      setSharedMaterials(shared);
      setError('');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMaterials();
  }, []);

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!file) {
      setError('Choose a PDF, DOCX, PPTX, or PNG file first.');
      return;
    }

    const data = new FormData();
    data.append('title', title.trim());
    data.append('subject', subject.trim());
    data.append('description', description.trim());
    data.append('file', file);

    setBusy(true);
    try {
      await uploadMaterial(data);
      setTitle('');
      setSubject('');
      setDescription('');
      setFile(null);
      event.target.reset();
      setNotice('Material uploaded successfully.');
      await refreshMaterials();
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleView(material) {
    setError('');
    setNotice('');
    try {
      const details = await getMaterial(material.id);
      setSelected(details);
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function handleDownload(material) {
    setError('');
    try {
      const blob = await downloadMaterial(material.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = material.originalName || `${material.title}.file`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(messageFrom(err));
    }
  }

  async function handleShare(material) {
    const email = (shareEmails[material.id] || '').trim();
    if (!email) {
      setError('Enter the registered email address to share with.');
      return;
    }

    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = await shareMaterial(material.id, email);
      setShares((current) => [
        ...current.filter(
          (item) =>
            !(item.materialId === material.id &&
              item.recipientId === result.share.recipient)
        ),
        {
          materialId: material.id,
          title: material.title,
          email,
          recipientId: result.share.recipient,
        },
      ]);
      setShareEmails((current) => ({ ...current, [material.id]: '' }));
      setNotice(result.message || 'Material shared successfully.');
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(share) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await revokeMaterialShare(share.materialId, share.recipientId);
      setShares((current) =>
        current.filter((item) => item !== share)
      );
      setNotice(`Access revoked for ${share.email}.`);
    } catch (err) {
      setError(messageFrom(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Study Materials</h1>
          <p>Upload, view, download, and share your learning resources.</p>
        </div>
      </header>

      {error && <div className="alert" role="alert">{error}</div>}
      {notice && <div className="success" role="status">{notice}</div>}

      <section className="card">
        <h2>Upload material</h2>
        <form onSubmit={handleUpload}>
          <label htmlFor="material-title">Title</label>
          <input
            id="material-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            required
          />

          <label htmlFor="material-subject">Subject</label>
          <input
            id="material-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />

          <label htmlFor="material-description">Description</label>
          <textarea
            id="material-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            rows={3}
            required
          />

          <label htmlFor="material-file">File (PDF, DOCX, PPTX, PNG; max 25 MB)</label>
          <input
            id="material-file"
            type="file"
            accept=".pdf,.docx,.pptx,.png"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            required
          />

          <button className="button" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : 'Upload material'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>My materials</h2>
        {loading ? (
          <p>Loading materials…</p>
        ) : materials.length === 0 ? (
          <p className="empty">No materials uploaded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.title}</td>
                    <td>{material.subject}</td>
                    <td>{material.originalName}</td>
                    <td>{formatSize(material.size)}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() => handleView(material)}
                        >
                          View
                        </button>
                        <button
                          className="button"
                          type="button"
                          onClick={() => handleDownload(material)}
                        >
                          Download
                        </button>
                      </div>
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          handleShare(material);
                        }}
                      >
                        <input
                          type="email"
                          aria-label={`Recipient email for ${material.title}`}
                          placeholder="Registered user's email"
                          value={shareEmails[material.id] || ''}
                          onChange={(event) =>
                            setShareEmails((current) => ({
                              ...current,
                              [material.id]: event.target.value,
                            }))
                          }
                          required
                        />
                        <button className="button secondary" type="submit" disabled={busy}>
                          Share
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Shared with me</h2>
        {loading ? (
          <p>Loading shared materials…</p>
        ) : sharedMaterials.length === 0 ? (
          <p className="empty">No materials have been shared with you yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>File</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sharedMaterials.map((material) => (
                  <tr key={material.id}>
                    <td>{material.title}</td>
                    <td>{material.subject}</td>
                    <td>{material.originalName}</td>
                    <td>{formatSize(material.size)}</td>
                    <td>
                      <div className="actions">
                        <button className="button secondary" type="button" onClick={() => handleView(material)}>View</button>
                        <button className="button" type="button" onClick={() => handleDownload(material)}>Download</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected && (
        <section className="card">
          <div className="page-header">
            <h2>Material details</h2>
            <button
              className="button secondary"
              type="button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <p><strong>Title:</strong> {selected.title}</p>
          <p><strong>Subject:</strong> {selected.subject}</p>
          <p><strong>Description:</strong> {selected.description}</p>
          <p><strong>File:</strong> {selected.originalName}</p>
          <p><strong>Size:</strong> {formatSize(selected.size)}</p>
          <p><strong>Uploaded:</strong> {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</p>
        </section>
      )}

      <section className="card">
        <h2>Shares created this session</h2>
        {shares.length === 0 ? (
          <p className="muted">Shares you create here will appear until you reload the page.</p>
        ) : (
          <ul>
            {shares.map((share) => (
              <li key={`${share.materialId}-${share.recipientId}`}>
                <strong>{share.title}</strong> — {share.email}{' '}
                <button
                  className="button danger"
                  type="button"
                  disabled={busy}
                  onClick={() => handleRevoke(share)}
                >
                  Revoke access
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
