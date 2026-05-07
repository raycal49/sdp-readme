using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class DocumentNavigationController : MonoBehaviour
{
    [SerializeField] private DocumentManager _documentManager;
    [SerializeField] private DocumentNavigationChannel _navigationChannel;

    [Header("Jump-to-page UI")]
    [SerializeField] private GameObject jumpPanel;
    [SerializeField] private TMP_InputField jumpInputField;

    [Header("PageCountJump")]
    [SerializeField] private TextMeshProUGUI pageCountJumpLabel;

    public void Configure(DocumentManager manager, DocumentNavigationChannel channel)
    {
        _documentManager = manager;
        _navigationChannel = channel;
    }

    private void Start()
    {
        _documentManager.OnDocumentStart += RefreshPageCountJumpLabel;

        if (jumpInputField != null)
        {
            jumpInputField.onSubmit.AddListener(_ => OnJumpConfirmClicked());
        }
    }


    // actually, due to the nature of how this works, really, its just `NavigateToPage` that must call `SendNavigate`! 
    // this is because, well, everything else just calls `NavigateToPage`!
    public bool NavigatePrevious()
    {
        if (_documentManager == null)
            return false;

        // this needs to call `SendNavigate`
        return NavigateToPage(_documentManager.CurrentPageIndex - 1);
    }

    public bool NavigateNext()
    {
        if (_documentManager == null)
            return false;

        return NavigateToPage(_documentManager.CurrentPageIndex + 1);
    }

    // Now THIS
    public bool NavigateToPage(int targetPageIndex)
    {
        if (!CanNavigate())
            return false;

        if (!_documentManager.TrySetCurrentPageIndex(targetPageIndex, out var clampedPageIndex))
            return false;

        int previousPageIndex = _documentManager.CurrentPageIndex - 1;

        int delta = clampedPageIndex - previousPageIndex;
        if (delta != 0)
        {
            RefreshPageCountJumpLabel();
        }

        var message = new DocumentNavigateMessage
        {
            pageIndex = clampedPageIndex,
        };

        _navigationChannel.SendNavigate(message);
        return true;
    }

    private void RefreshPageCountJumpLabel()
    {
        if (pageCountJumpLabel == null || _documentManager == null)
            return;

        int totalPages = _documentManager.TotalPages;

        if (totalPages <= 0)
        {
            pageCountJumpLabel.text = "- / -";
            return;
        }

        // Convert 0-based index to 1-based page number for display.
        int currentDisplayPage = Mathf.Clamp(_documentManager.CurrentPageIndex + 1, 1, totalPages);
        pageCountJumpLabel.text = $"{currentDisplayPage} / {totalPages}";
    }

    private bool CanNavigate()
    {
        if (_documentManager == null)
        {
            Debug.LogWarning("DocumentNavigationController: DocumentManager is not assigned.");
            return false;
        }


        if (_documentManager.TotalPages <= 0)
        {
            Debug.LogWarning("DocumentNavigationController: active document has no pages.");
            return false;
        }

        return true;
    }

    public void OnPageCountJumpClicked()
    {
        if (jumpPanel == null || jumpInputField == null)
        {
            Debug.LogWarning("DocumentNavigationControls: jump panel/input not assigned.");
            return;
        }

        // 1. Programmatic Character Limit
        if (_documentManager != null && _documentManager.TotalPages > 0)
        {
            jumpInputField.characterLimit = _documentManager.TotalPages.ToString().Length;
        }

        // 2. Local Positioning (Assumes JumpPanel is child of PDFMenuRoot)
        jumpPanel.transform.localPosition = new Vector3(0, 0, -0.055f);
        jumpPanel.transform.localRotation = Quaternion.identity;

        // 3. Activation
        jumpPanel.SetActive(true);
    }

    public void OnJumpConfirmClicked()
    {
        if (jumpInputField == null)
        {
            Debug.LogWarning("DocumentNavigationControls: jump input field is not assigned.");
            return;
        }

        string raw = jumpInputField.text?.Trim();
        var oneBasedPage = int.Parse(raw);

        // convert user-facing 1-based page number to 0-based index
        int zeroBasedPage = oneBasedPage - 1;

        bool moved = NavigateToPage(zeroBasedPage);
        if (!moved)
        {
            Debug.LogWarning($"DocumentNavigationControls: jump target out of range or navigation unavailable ({oneBasedPage}).");
            return; // keep open
        }

        jumpPanel.SetActive(false);
    }


    public void OnJumpCancelClicked()
    {
        if (jumpPanel != null)
            jumpPanel.SetActive(false);
    }
}