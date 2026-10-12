import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  FileText,
  Building2,
  User,
  Calendar,
  CheckCircle,
  ExternalLink,
  Download,
  Eye,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import Button from '../../../components/common/Button/Button';
import ConvertToDealButton from '../../../components/records/ConvertToDealButton';
import styles from './TenderDialog.module.css';

const Row = ({ label, value }) =>
  value ? (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  ) : null;

const Section = ({ title, icon: Icon, children }) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      {Icon && <Icon size={15} />}
      <span>{title}</span>
    </div>
    <div className={styles.sectionBody}>{children}</div>
  </div>
);

export default function TenderDialog({ tender, onClose }) {
  const navigate = useNavigate();
  const [savingLead, setSavingLead] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Use linkedLeadId and linkedDealId from tender data passed from parent
  const linkedLeadId = tender?.linkedLeadId;
  const linkedDealId = tender?.linkedDealId;

  const { data: leadApprovalSettings } = useQuery({
    queryKey: ['lead-approval-settings'],
    queryFn: async () => {
      return api
        .get('/admin/settings/lead-approval-settings')
        .then((res) => res.data?.data);
    },
    enabled: !!tender,
    staleTime: 1000 * 60 * 5,
  });

  const leadApprovalsRequired = leadApprovalSettings?.leadApprovalsRequired;

  const handleSaveAsLead = async () => {
    setSavingLead(true);
    try {
      const response = await api.post('/tenders/save-as-lead', {
        tender,
        supportDocuments: tender.supportDocuments || [],
      });

      const leadId = response.data?.data?._id;
      toast.success('Saved as lead with support documents successfully.');
      onClose();

      if (leadId) {
        navigate(`/o/lead/${leadId}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save lead.');
    } finally {
      setSavingLead(false);
    }
  };

  const docs = tender.supportDocuments || [];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={20} className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>{tender.description}</h2>
              {tender.tenderNumber && (
                <span className={styles.tenderNum}>{tender.tenderNumber}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X size={18} />}
            className={styles.closeBtn}
          />
        </div>

        <div className={styles.body}>
          {/* Left col */}
          <div className={styles.col}>
            <Section title="Tender Details" icon={FileText}>
              <Row label="Tender Number" value={tender.tenderNumber} />
              <Row label="Status" value={tender.status} />
              <Row label="Category" value={tender.category} />
              <Row
                label="Date Published"
                value={formatDateTime(tender.datePublished)}
              />
              <Row
                label="Closing Date"
                value={formatDateTime(tender.closingDate)}
              />
              <Row label="Validity" value={tender.validity} />
              <Row label="Province" value={tender.province} />
              <Row label="Department" value={tender.department} />
              <Row
                label="eSubmission"
                value={
                  tender.eSubmission
                    ? 'Yes'
                    : tender.eSubmission === false
                      ? 'No'
                      : undefined
                }
              />
              <Row
                label="Two Envelope"
                value={
                  tender.twoEnvelopeSubmission
                    ? 'Yes'
                    : tender.twoEnvelopeSubmission === false
                      ? 'No'
                      : undefined
                }
              />
            </Section>

            <Section title="Client" icon={Building2}>
              <Row label="Client" value={tender.client} />
            </Section>

            <Section title="Briefing Session" icon={Calendar}>
              <Row
                label="Is there a briefing session?"
                value={tender.briefingSession}
              />
              <Row
                label="Is it compulsory?"
                value={tender.briefingCompulsory}
              />
              <Row
                label="Briefing Date and Time"
                value={formatDateTime(tender.briefingDate)}
              />
              <Row label="Briefing Venue" value={tender.briefingVenue} />
              <Row label="Street" value={tender.streetName} />
              <Row label="Suburb" value={tender.suburb} />
              <Row label="Town" value={tender.town} />
              <Row label="Code" value={tender.code} />
            </Section>
          </div>

          {/* Right col */}
          <div className={styles.col}>
            <Section title="Contact" icon={User}>
              <Row label="Contact Person" value={tender.contactPerson} />
              <Row label="Email" value={tender.email} />
              <Row label="Telephone" value={tender.telephone} />
              <Row label="Fax" value={tender.fax} />
              <Row label="Username" value={tender.username} />
            </Section>

            {tender.conditions && (
              <Section title="Conditions" icon={CheckCircle}>
                <p className={styles.conditions}>{tender.conditions}</p>
              </Section>
            )}

            {/* Support Documents */}
            <Section title="Support Documents" icon={FileText}>
              {docs.length === 0 ? (
                <p className={styles.noDocs}>No support documents.</p>
              ) : (
                <table className={styles.docsTable}>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Updated By</th>
                      <th>Date Modified</th>
                      <th>Ext</th>
                      <th>Active</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc, i) => (
                      <tr key={i}>
                        <td className={styles.fileName}>{doc.fileName}</td>
                        <td>{doc.lastModifiedBy}</td>
                        <td>{formatDate(doc.dateModified)}</td>
                        <td>
                          <span className={styles.ext}>{doc.extension}</span>
                        </td>
                        <td>
                          <span
                            className={`${styles.activeBadge} ${doc.active ? styles.activeYes : styles.activeNo}`}
                          >
                            {doc.active ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye size={14} />}
                            onClick={() => setPreviewDoc(doc)}
                            title="Preview"
                            className={styles.previewBtn}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className={styles.footerActions}>
            {linkedLeadId && (
              <Button
                variant="secondary"
                icon={<ExternalLink size={14} />}
                onClick={() => navigate(`/o/lead/${linkedLeadId}`)}
              >
                View Linked Lead
              </Button>
            )}
            {linkedDealId && (
              <Button
                variant="secondary"
                icon={<ExternalLink size={14} />}
                onClick={() => navigate(`/o/deal/${linkedDealId}`)}
              >
                View Linked Deal
              </Button>
            )}
            {!linkedDealId &&
              (leadApprovalsRequired ? (
                <Button
                  variant="primary"
                  icon={<Save size={14} />}
                  onClick={handleSaveAsLead}
                  loading={savingLead}
                >
                  Save as Lead
                </Button>
              ) : (
                <ConvertToDealButton
                  leadId={null}
                  lead={tender}
                  tender={tender}
                  source="tender"
                  onSuccess={null}
                />
              ))}
          </div>
        </div>
      </div>

      {/* Document preview overlay */}
      {previewDoc && (
        <div
          className={styles.previewOverlay}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className={styles.previewModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.previewHeader}>
              <span>{previewDoc.fileName}</span>
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={16} />}
                onClick={() => setPreviewDoc(null)}
              />
            </div>
            <div className={styles.previewBody}>
              {previewDoc.url ? (() => {
                const proxyUrl = `/api/v1/tenders/document-proxy?url=${encodeURIComponent(previewDoc.url)}`;
                const ext = (previewDoc.extension || '').toLowerCase();

                if (['pdf'].includes(ext)) {
                  return (
                    <iframe
                      src={proxyUrl}
                      title={previewDoc.fileName}
                      className={styles.previewFrame}
                    />
                  );
                } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                  return (
                    <img
                      src={proxyUrl}
                      alt={previewDoc.fileName}
                      className={styles.previewImg}
                    />
                  );
                } else {
                  return (
                    <div className={styles.previewFallback}>
                      <FileText size={40} />
                      <p>{previewDoc.fileName}</p>
                      <a
                        href={proxyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.downloadLink}
                      >
                        <Download size={14} /> Download
                      </a>
                    </div>
                  );
                }
              })() : (
                <div className={styles.previewFallback}>
                  <FileText size={40} />
                  <p>No preview available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
