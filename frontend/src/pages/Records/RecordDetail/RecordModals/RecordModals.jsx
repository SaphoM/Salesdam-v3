import Modal from '../../../../components/common/Modal/Modal';
import Button from '../../../../components/common/Button/Button';
import PDFPreviewModal from '../../../../components/PDFPreviewModal/PDFPreviewModal';
import DeleteConfirmationModal from '../../../../components/records/DeleteConfirmationModal/DeleteConfirmationModal';

const RecordModals = ({
  deleteModalOpen,
  setDeleteModalOpen,
  deleting,
  onConfirmDelete,
  pdfModalOpen,
  setPdfModalOpen,
  pdfUrl,
  pdfFileName,
  quoteConfirmOpen,
  setQuoteConfirmOpen,
  generatingQuote,
  onConfirmGenerateQuote,
  quoteValidationErrors,
  setQuoteValidationErrors,
  quoteNoLineItemsOpen,
  setQuoteNoLineItemsOpen,
  invoiceConfirmOpen,
  setInvoiceConfirmOpen,
  generatingInvoice,
  onConfirmGenerateInvoice,
  invoiceValidationErrors,
  setInvoiceValidationErrors,
  invoiceNoLineItemsOpen,
  setInvoiceNoLineItemsOpen,
}) => {
  return (
    <>
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        isDeleting={deleting}
        recordCount={1}
      />

      <PDFPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        pdfUrl={pdfUrl}
        fileName={pdfFileName}
      />

      <Modal
        isOpen={quoteConfirmOpen}
        onClose={() => {
          setQuoteConfirmOpen(false);
          setQuoteValidationErrors([]);
        }}
        title="Generate Quote"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setQuoteConfirmOpen(false);
                setQuoteValidationErrors([]);
              }}
            >
              Close
            </Button>
            {quoteValidationErrors.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                loading={generatingQuote}
                onClick={onConfirmGenerateQuote}
              >
                Generate
              </Button>
            )}
          </div>
        }
      >
        {quoteValidationErrors.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: '#dc2626', fontSize: '16px', marginTop: '2px' }}>⚠</span>
              <div>
                <p style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px', fontWeight: '500' }}>
                  Cannot generate quote due to the following issues:
                </p>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {quoteValidationErrors.map((error, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '10px 12px',
                      backgroundColor: '#fee2e2',
                      borderLeft: '3px solid #dc2626',
                      borderRadius: '4px',
                      color: '#7f1d1d',
                      fontSize: '13px',
                      lineHeight: '1.5',
                    }}>
                      <span style={{ color: '#dc2626', fontWeight: 'bold', flexShrink: 0 }}>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
              Please update your Invoice & Quote settings before generating a quote.
            </p>
          </div>
        ) : (
          <p style={{ marginBottom: '8px', color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
            This will create a new quote document for this deal. The quote will be generated and you'll be able to preview it immediately.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={invoiceConfirmOpen}
        onClose={() => {
          setInvoiceConfirmOpen(false);
          setInvoiceValidationErrors([]);
        }}
        title="Generate Invoice"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInvoiceConfirmOpen(false);
                setInvoiceValidationErrors([]);
              }}
            >
              Close
            </Button>
            {invoiceValidationErrors.length === 0 && (
              <Button
                variant="primary"
                size="sm"
                loading={generatingInvoice}
                onClick={onConfirmGenerateInvoice}
              >
                Generate
              </Button>
            )}
          </div>
        }
      >
        {invoiceValidationErrors.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <span style={{ color: '#dc2626', fontSize: '16px', marginTop: '2px' }}>⚠</span>
              <div>
                <p style={{ margin: '0 0 8px 0', color: '#374151', fontSize: '14px', fontWeight: '500' }}>
                  Cannot generate invoice due to the following issues:
                </p>
                <ul style={{ margin: '0', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {invoiceValidationErrors.map((error, index) => (
                    <li key={index} style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '10px 12px',
                      backgroundColor: '#fee2e2',
                      borderLeft: '3px solid #dc2626',
                      borderRadius: '4px',
                      color: '#7f1d1d',
                      fontSize: '13px',
                      lineHeight: '1.5',
                    }}>
                      <span style={{ color: '#dc2626', fontWeight: 'bold', flexShrink: 0 }}>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p style={{ margin: '0', color: '#666', fontSize: '13px' }}>
              Please update your Invoice & Quote settings before generating an invoice.
            </p>
          </div>
        ) : (
          <p style={{ marginBottom: '8px', color: '#666', fontSize: '14px', lineHeight: '1.5' }}>
            This will create a new invoice document for this order. The invoice will be generated and you'll be able to preview it immediately.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={quoteNoLineItemsOpen}
        onClose={() => setQuoteNoLineItemsOpen(false)}
        title="Cannot Generate Quote"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              size="md"
              onClick={() => setQuoteNoLineItemsOpen(false)}
            >
              OK
            </Button>
          </div>
        }
      >
        <p style={{ color: '#dc2626', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}>
          This deal has no line items. Please add line items before generating a quote.
        </p>
      </Modal>

      <Modal
        isOpen={invoiceNoLineItemsOpen}
        onClose={() => setInvoiceNoLineItemsOpen(false)}
        title="Cannot Generate Invoice"
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setInvoiceNoLineItemsOpen(false)}
            >
              OK
            </Button>
          </div>
        }
      >
        <p style={{ color: '#dc2626', fontSize: '14px', lineHeight: '1.5', fontWeight: '500' }}>
          This order has no line items. Please add line items before generating an invoice.
        </p>
      </Modal>
    </>
  );
};

export default RecordModals;
