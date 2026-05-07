using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class ManualViewer : MonoBehaviour
{
    public static ManualViewer Instance { get; private set; }

    [Header("List Panel")]
    [SerializeField] private GameObject listPanel;
    [SerializeField] private GameObject viewerPanel;
    [SerializeField] private Transform listContent;
    [SerializeField] private GameObject docButtonPrefab;
    [SerializeField] private Button clearAllButton;
    [SerializeField] private GameObject confirmPanel;
    [SerializeField] private Button confirmYesButton;
    [SerializeField] private Button confirmNoButton;

    [Header("Cache reset wiring")]
    [SerializeField] private DocumentManualViewerBridge bridge;
    [SerializeField] private DocumentManager documentManager;

    [Header("Viewer")]
    [SerializeField] private RawImage pageDisplay;
    [SerializeField] private Text pageCounterText;
    [SerializeField] private Button prevButton;
    [SerializeField] private Button nextButton;
    [SerializeField] private Button closeViewerButton;
    [SerializeField] private Button closeListButton;

    [Header("Placement")]
    [SerializeField] private float panelDistance = 0.8f;

    private List<ManualDocument> _documents = new List<ManualDocument>();
    private ManualDocument _currentDoc;
    private int _currentPage = 0;

    void Awake()
    {
        Instance = this;
        EnsureListLayout();
        listPanel.SetActive(false);
        viewerPanel.SetActive(false);

        prevButton.onClick.AddListener(PrevPage);
        nextButton.onClick.AddListener(NextPage);
        closeViewerButton.onClick.AddListener(CloseViewer);
        closeListButton.onClick.AddListener(CloseList);

        if (clearAllButton != null) clearAllButton.onClick.AddListener(OnClearAllClicked);
        if (confirmYesButton != null) confirmYesButton.onClick.AddListener(OnConfirmYesClicked);
        if (confirmNoButton != null) confirmNoButton.onClick.AddListener(OnConfirmNoClicked);
        if (confirmPanel != null) confirmPanel.SetActive(false);
        UpdateClearButtonState();
    }

    public void AddDocument(string docName, Texture2D[] pages)
    {
        var doc = new ManualDocument { name = docName, pages = pages };
        _documents.Add(doc);
        SpawnDocumentButton(doc);
        UpdateClearButtonState();
        Debug.Log($"[ManualViewer] AddDocument '{docName}' pages={(pages != null ? pages.Length : 0)} totalDocs={_documents.Count} clearInteractable={(clearAllButton != null && clearAllButton.interactable)}");
    }

    public void ClearAllDocuments()
    {
        if (viewerPanel != null && viewerPanel.activeSelf)
            CloseViewer();

        if (pageDisplay != null)
            pageDisplay.texture = null;

        _currentDoc = null;
        _currentPage = 0;

        foreach (var doc in _documents)
        {
            if (doc?.pages == null) continue;
            for (int i = 0; i < doc.pages.Length; i++)
            {
                if (doc.pages[i] != null) Destroy(doc.pages[i]);
                doc.pages[i] = null;
            }
            doc.pages = null;
        }
        _documents.Clear();

        DestroyListContentChildren();
        UpdateClearButtonState();
    }

    private void OnClearAllClicked()
    {
        Debug.Log($"[ManualViewer] OnClearAllClicked. confirmPanel={(confirmPanel != null)} interactable={(clearAllButton != null && clearAllButton.interactable)} docs={_documents.Count}");
        if (confirmPanel == null)
        {
            Debug.LogWarning("[ManualViewer] confirmPanel is null — cannot show confirm dialog.");
            return;
        }
        BringConfirmPanelToFront();
        confirmPanel.SetActive(true);
    }

    private void OnConfirmNoClicked()
    {
        if (confirmPanel != null) confirmPanel.SetActive(false);
    }

    private void OnConfirmYesClicked()
    {
        ClearAllDocuments();
        if (bridge != null) bridge.ClearBuffer();
        if (documentManager != null) documentManager.ClearAssemblies();
        if (confirmPanel != null) confirmPanel.SetActive(false);
    }

    private void DestroyListContentChildren()
    {
        if (listContent == null) return;
        for (int i = listContent.childCount - 1; i >= 0; i--)
            Destroy(listContent.GetChild(i).gameObject);
    }

    // Ensures ConfirmPanel renders above its siblings in the list canvas,
    // and on its own world-space canvas if it has one (raised sortingOrder),
    // and is nudged forward in local Z so it can't z-fight the list in VR.
    private void BringConfirmPanelToFront()
    {
        if (confirmPanel == null) return;

        confirmPanel.transform.SetAsLastSibling();

        var local = confirmPanel.transform.localPosition;
        if (local.z >= 0f) local.z = -0.005f;
        confirmPanel.transform.localPosition = local;

        var canvas = confirmPanel.GetComponent<Canvas>();
        if (canvas != null)
        {
            canvas.overrideSorting = true;
            canvas.sortingOrder = 1000;
        }
    }

    private void UpdateClearButtonState()
    {
        if (clearAllButton != null)
            clearAllButton.interactable = _documents.Count > 0;
    }

    private void EnsureListLayout()
    {
        if (listContent == null) return;

        var go = listContent.gameObject;

        var vlg = go.GetComponent<VerticalLayoutGroup>();
        if (vlg == null) vlg = go.AddComponent<VerticalLayoutGroup>();

        vlg.childControlWidth = true;
        vlg.childControlHeight = true;
        vlg.childForceExpandWidth = true;
        vlg.childForceExpandHeight = false;
        vlg.spacing = 8f;

        var fitter = go.GetComponent<ContentSizeFitter>();
        if (fitter == null) fitter = go.AddComponent<ContentSizeFitter>();

        fitter.horizontalFit = ContentSizeFitter.FitMode.Unconstrained;
        fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
    }

    private void SpawnDocumentButton(ManualDocument doc)
    {
        var go = Instantiate(docButtonPrefab);
        go.transform.SetParent(listContent, false);

        var layout = go.GetComponent<LayoutElement>();
        if (layout == null) layout = go.AddComponent<LayoutElement>();
        if (layout.preferredHeight <= 0f) layout.preferredHeight = 72f;

        var label = go.GetComponentInChildren<TMP_Text>();
        if (label != null) label.text = doc.name;

        var btn = go.GetComponent<Button>();
        btn.onClick.AddListener(() => OpenDocument(doc));
    }

    public void ShowListPanel()
    {
        PlaceInFrontOfUser(listPanel);
        listPanel.SetActive(true);
        viewerPanel.SetActive(false);
    }

    public void CloseList()
    {
        listPanel.SetActive(false);
    }

    private void OpenDocument(ManualDocument doc)
    {
        _currentDoc = doc;
        _currentPage = 0;
        listPanel.SetActive(false);
        PlaceInFrontOfUser(viewerPanel);
        viewerPanel.SetActive(true);
        RefreshPage();
    }

    private void RefreshPage()
    {
        pageDisplay.texture = _currentDoc.pages[_currentPage];
        if (pageCounterText != null)
            pageCounterText.text = $"{_currentPage + 1} / {_currentDoc.pages.Length}";
        prevButton.interactable = _currentPage > 0;
        nextButton.interactable = _currentPage < _currentDoc.pages.Length - 1;
    }

    private void PrevPage()
    {
        if (_currentPage > 0) { _currentPage--; RefreshPage(); }
    }

    private void NextPage()
    {
        if (_currentDoc != null && _currentPage < _currentDoc.pages.Length - 1)
        { _currentPage++; RefreshPage(); }
    }

    private void CloseViewer()
    {
        viewerPanel.SetActive(false);
    }

    private void PlaceInFrontOfUser(GameObject panel)
    {
        Transform cam = Camera.main.transform;
        Vector3 forward = cam.forward;
        forward.y = 0f;
        forward.Normalize();
        panel.transform.position = cam.position
                                 + forward * panelDistance;
        panel.transform.LookAt(cam.position);
        panel.transform.Rotate(0f, 180f, 0f);
    }
}

[System.Serializable]
public class ManualDocument
{
    public string name;
    public Texture2D[] pages;
}