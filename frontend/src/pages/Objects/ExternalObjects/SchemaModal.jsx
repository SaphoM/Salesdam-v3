import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/common/Button/Button';

const SchemaModal = ({ schemaModal, setSchemaModal, onApply }) => {
  if (!schemaModal) return null;

  const updateField = (index, key, value) => {
    setSchemaModal((prev) => ({
      ...prev,
      fieldSuggestions: prev.fieldSuggestions.map((f, i) =>
        i === index ? { ...f, [key]: value } : f,
      ),
    }));
  };

  return (
    <Modal
      isOpen={!!schemaModal}
      onClose={() => setSchemaModal(null)}
      title="Map Fields from API Response"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => setSchemaModal(null)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onApply(schemaModal.extId, schemaModal.fieldSuggestions)
            }
          >
            Save Mappings & Provision Object
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-gray-600)',
            margin: 0,
          }}
        >
          Found <strong>{schemaModal.recordCount}</strong> records. Toggle
          fields to include/exclude, rename labels, or change field types before
          provisioning.
        </p>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--border-color)',
                background: 'var(--color-gray-50)',
              }}
            >
              {[
                'Include',
                'API Key',
                'Field API Name',
                'Label',
                'Type',
                'Sample',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '7px 10px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: 12,
                    color: 'var(--color-gray-600)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {(schemaModal.fieldSuggestions || []).map((f, i) => (
              <tr
                key={f.externalKey}
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <td style={{ padding: '6px 10px' }}>
                  <input
                    type="checkbox"
                    checked={f.include}
                    onChange={(e) =>
                      updateField(i, 'include', e.target.checked)
                    }
                  />
                </td>

                <td
                  style={{
                    padding: '6px 10px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: 'var(--color-gray-500)',
                  }}
                >
                  {f.externalKey}
                </td>

                <td style={{ padding: '6px 10px' }}>
                  <input
                    style={inputStyleMono}
                    value={f.fieldApiName}
                    onChange={(e) =>
                      updateField(i, 'fieldApiName', e.target.value)
                    }
                  />
                </td>

                <td style={{ padding: '6px 10px' }}>
                  <input
                    style={inputStyle}
                    value={f.fieldLabel}
                    onChange={(e) =>
                      updateField(i, 'fieldLabel', e.target.value)
                    }
                  />
                </td>

                <td style={{ padding: '6px 10px' }}>
                  <select
                    style={selectStyle}
                    value={f.fieldType}
                    onChange={(e) =>
                      updateField(i, 'fieldType', e.target.value)
                    }
                  >
                    {[
                      'text',
                      'number',
                      'currency',
                      'date',
                      'datetime',
                      'boolean',
                      'email',
                      'phone',
                      'url',
                      'textarea',
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>

                <td
                  style={{
                    padding: '6px 10px',
                    fontSize: 11,
                    color: 'var(--color-gray-400)',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.sampleValue}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
};

// Optional: reuse styles to clean JSX
const inputStyle = {
  width: '100%',
  padding: '3px 6px',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  fontSize: 12,
};

const inputStyleMono = {
  ...inputStyle,
  fontFamily: 'monospace',
};

const selectStyle = {
  padding: '3px 6px',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  fontSize: 12,
};

export default SchemaModal;
