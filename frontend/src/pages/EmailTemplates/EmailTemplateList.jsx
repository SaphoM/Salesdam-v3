import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Mail,
  Edit2,
  Trash2,
  Search,
  Tag,
  ToggleLeft,
  ToggleRight,
  Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button/Button';
import Layout from '../../layout/Layout';
import styles from './EmailTemplateList.module.css';

export default function EmailTemplateList() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tmplRes, catRes] = await Promise.all([
        api.get('/email-templates', {
          params: {
            search: search || undefined,
            category: activeCategory || undefined,
          },
        }),
        api.get('/email-templates/categories'),
      ]);
      setTemplates(tmplRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/email-templates/${id}`);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleToggle = async (tmpl) => {
    try {
      await api.put(`/email-templates/${tmpl._id}`, {
        isActive: !tmpl.isActive,
      });
      setTemplates((prev) =>
        prev.map((t) =>
          t._id === tmpl._id ? { ...t, isActive: !t.isActive } : t,
        ),
      );
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDuplicate = async (tmpl) => {
    try {
      const res = await api.get(`/email-templates/${tmpl._id}`);
      const t = res.data.data;
      await api.post('/email-templates', {
        ...t,
        _id: undefined,
        name: `${t.name} (copy)`,
      });
      toast.success('Template duplicated');
      load();
    } catch {
      toast.error('Duplicate failed');
    }
  };

  // Group by category
  const grouped = templates.reduce((acc, t) => {
    const cat = t.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  return (
    <Layout
      title="Email Templates"
      description="Manage reusable email templates for automation"
    >
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Email Templates</h1>
            <p className={styles.subtitle}>
              Reusable email templates with merge field support
            </p>
          </div>
          <Link to="/email-templates/new">
            <Button icon={<Plus size={14} />}>New Template</Button>
          </Link>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search templates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.catChips}>
            <button
              className={`${styles.catChip} ${!activeCategory ? styles.catActive : ''}`}
              onClick={() => setActiveCategory('')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`${styles.catChip} ${activeCategory === cat ? styles.catActive : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={styles.skeletons}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <Mail size={48} strokeWidth={1} />
            <h3>No templates yet</h3>
            <p>Create your first email template to reuse across automations.</p>
            <Link to="/email-templates/new">
              <Button>New Template</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.content}>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, items]) => (
                <div key={cat} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <Tag size={14} />
                    <span>{cat}</span>
                    <span className={styles.groupCount}>{items.length}</span>
                  </div>
                  <div className={styles.grid}>
                    {items.map((tmpl) => (
                      <div
                        key={tmpl._id}
                        className={`${styles.card} ${!tmpl.isActive ? styles.inactive : ''}`}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.cardIcon}>
                            <Mail size={18} />
                          </div>
                          <div className={styles.cardMeta}>
                            <span className={styles.cardName}>{tmpl.name}</span>
                            <span className={styles.cardSubject}>
                              {tmpl.subject}
                            </span>
                          </div>
                        </div>
                        {tmpl.description && (
                          <p className={styles.cardDesc}>{tmpl.description}</p>
                        )}
                        <div className={styles.cardTags}>
                          {(tmpl.tags || []).map((tag) => (
                            <span key={tag} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className={styles.cardActions}>
                          <button
                            className={styles.toggleBtn}
                            onClick={() => handleToggle(tmpl)}
                            title={tmpl.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {tmpl.isActive ? (
                              <ToggleRight
                                size={20}
                                className={styles.toggleOn}
                              />
                            ) : (
                              <ToggleLeft size={20} />
                            )}
                          </button>
                          <button
                            className={styles.actionBtn}
                            title="Duplicate"
                            onClick={() => handleDuplicate(tmpl)}
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            className={styles.actionBtn}
                            title="Edit"
                            onClick={() =>
                              navigate(`/email-templates/${tmpl._id}`)
                            }
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.danger}`}
                            title="Delete"
                            onClick={() => handleDelete(tmpl._id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
