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
    }

    public void AddDocument(string docName, Texture2D[] pages)
    {
        var doc = new ManualDocument { name = docName, pages = pages };
        _documents.Add(doc);
        SpawnDocumentButton(doc);
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