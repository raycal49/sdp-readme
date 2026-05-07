using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Bridges DocumentManager (Person B's backend) with ManualViewer (Person A's UI).
/// Buffers streamed JPEG pages until all have arrived, then registers the document
/// in ManualViewer's list panel for the user to open manually.
/// </summary>
public class DocumentManualViewerBridge : MonoBehaviour
{
    [SerializeField] private DocumentManager _documentManager;

    // Buffers decoded textures keyed by page index until the full set arrives.
    private Texture2D[] _pageBuffer;
    private int _receivedPageCount;
    private string _pendingDocumentName;

    private void OnEnable()
    {
        if (_documentManager == null)
        {
            Debug.LogError("DocumentManualViewerBridge: DocumentManager is not assigned.");
            return;
        }

        _documentManager.OnDocumentStart  += HandleDocumentStart;
        _documentManager.OnDocumentPage   += HandleDocumentPage;
        _documentManager.OnDocumentClose  += HandleDocumentClose;
    }

    private void OnDisable()
    {
        if (_documentManager == null) return;

        _documentManager.OnDocumentStart  -= HandleDocumentStart;
        _documentManager.OnDocumentPage   -= HandleDocumentPage;
        _documentManager.OnDocumentClose  -= HandleDocumentClose;
    }

    private void HandleDocumentStart()
    {
        if (_pageBuffer != null && _receivedPageCount > 0)
        {
            Debug.LogWarning("DocumentManualViewerBridge: new doc started before previous completed.");
            // optionally RegisterWithManualViewer() here if partial is acceptable
        }
        _pendingDocumentName = _documentManager.CurrentDocumentName;
        int total = _documentManager.TotalPages;

        _pageBuffer = total > 0 ? new Texture2D[total] : null;
        _receivedPageCount = 0;

        Debug.Log($"DocumentManualViewerBridge: started '{_pendingDocumentName}', expecting {total} pages.");
    }

    private void HandleDocumentPage(DocumentPageMessage message)
    {
        if (_pageBuffer == null)
        {
            Debug.LogWarning("DocumentManualViewerBridge: received page but no document is buffering.");
            return;
        }

        int index = message.pageIndex;
        if (index < 0 || index >= _pageBuffer.Length)
        {
            Debug.LogWarning($"DocumentManualViewerBridge: page index {index} out of range (buffer size {_pageBuffer.Length}).");
            return;
        }

        // message.data is the fully assembled JPEG byte array from DocumentManager.
        if (!PdfPageDisplay.TryDecodeJpegBytes(message.data, out var texture))
        {
            Debug.LogError($"DocumentManualViewerBridge: failed to decode JPEG for page {index}.");
            return;
        }

        if (_pageBuffer[index] == null)
        {
            _pageBuffer[index] = texture;
            _receivedPageCount++;
        }
        else
        {
            // Duplicate arrival — discard the new decode to avoid a leak.
            Destroy(texture);
        }

        Debug.Log($"DocumentManualViewerBridge: buffered page {index + 1} / {_pageBuffer.Length}.");

        if (_receivedPageCount >= _pageBuffer.Length)
            RegisterWithManualViewer();
    }

    private void HandleDocumentClose(DocumentCloseMessage _)
    {
        // Reset buffer; don't register an incomplete document.
        _pageBuffer = null;
        _receivedPageCount = 0;
        _pendingDocumentName = null;
    }

    private void RegisterWithManualViewer()
    {
        if (ManualViewer.Instance == null)
        {
            Debug.LogError("DocumentManualViewerBridge: ManualViewer.Instance is null.");
            return;
        }

        string docName = string.IsNullOrWhiteSpace(_pendingDocumentName)
            ? "Received Document"
            : _pendingDocumentName;

        ManualViewer.Instance.AddDocument(docName, _pageBuffer);
        ManualViewer.Instance.ShowListPanel();

        Debug.Log($"DocumentManualViewerBridge: registered '{docName}' with {_pageBuffer.Length} pages in ManualViewer.");

        // Clear buffer — ManualViewer now owns the textures.
        _pageBuffer = null;
        _receivedPageCount = 0;
        _pendingDocumentName = null;
    }
}