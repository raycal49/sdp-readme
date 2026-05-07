using UnityEngine;

public class PdfPageDisplay : MonoBehaviour
{
    [Header("Dev bootstrap")]
    [Tooltip("When enabled, the component auto-renders a test source in Start().")]
    [SerializeField] private bool _isDevMode;
    [SerializeField] private Material pageMaterialTemplate;
    [Tooltip("Optional raw JPEG bytes test source (TextAsset). Used when Test Texture is not assigned.")]
    [SerializeField] private TextAsset _testJpegBytes;

    [Header("Render target (required)")]
    [Tooltip("Assign a scene Renderer (e.g., your editor-created PdfScreen mesh). No runtime quad will be created.")]
    [SerializeField] private Renderer _targetRenderer;

    private Material _material;
    private Texture2D _currentTexture;
    private bool _initialized;

    private static readonly int MainTexId = Shader.PropertyToID("_MainTex");
    private static readonly int BaseMapId = Shader.PropertyToID("_BaseMap");

    private void Awake()
    {
        EnsureInitialized();
    }

    private void Start()
    {
        if (!_isDevMode)
            return;

        if (_testJpegBytes != null)
        {
            ShowFromBytes(_testJpegBytes.bytes, 0, 0);
            return;
        }

        Debug.LogWarning("PdfPageDisplay: Dev mode is enabled but no test source is assigned (Test Texture or Test Jpeg Bytes).");
    }

    public void Show(Texture2D tex)
    {
        if (tex == null)
            return;

        EnsureInitialized();
        if (!_initialized || _material == null)
            return;

        _currentTexture = tex;

        // Handle URP and legacy texture property names safely.
        if (_material.HasProperty(BaseMapId))
            _material.SetTexture(BaseMapId, tex);
        if (_material.HasProperty(MainTexId))
            _material.SetTexture(MainTexId, tex);

        if (_targetRenderer != null)
        {
            _targetRenderer.gameObject.SetActive(true);
        }
    }

    public void ShowFromBytes(byte[] jpegBytes, int width, int height)
    {
        if (!TryDecodeJpegBytes(jpegBytes, out var decodedTexture))
        {
            Debug.LogError("PdfPageDisplay: failed to decode JPEG byte payload.");
            return;
        }

        if (width > 0 && height > 0 && (decodedTexture.width != width || decodedTexture.height != height))
        {
            Debug.LogWarning($"PdfPageDisplay: decoded dimensions ({decodedTexture.width}x{decodedTexture.height}) do not match payload metadata ({width}x{height}).");
        }

        Show(decodedTexture);
    }

    public static bool TryDecodeJpegBytes(byte[] jpegBytes, out Texture2D decodedTexture)
    {
        decodedTexture = null;

        if (jpegBytes == null || jpegBytes.Length == 0)
        {
            Debug.LogError("PdfPageDisplay: received empty JPEG byte payload.");
            return false;
        }

        var candidateTexture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
        if (!candidateTexture.LoadImage(jpegBytes, markNonReadable: false))
        {
            Destroy(candidateTexture);
            return false;
        }

        decodedTexture = candidateTexture;
        return true;
    }

    [ContextMenu("Test Show")]
    private void TestShow()
    {
        if (_testJpegBytes != null)
            ShowFromBytes(_testJpegBytes.bytes, 0, 0);
    }

    private void EnsureInitialized()
    {
        if (_initialized)
            return;

        if (_targetRenderer == null)
        {
            Debug.LogError("PdfPageDisplay: Target Renderer is not assigned. Assign an editor-created render object.");
            return;
        }

        if (pageMaterialTemplate != null)
        {
            _material = new Material(pageMaterialTemplate);
            _targetRenderer.material = _material;
        }
        else
        {
            _material = _targetRenderer.material;
            if (_material == null)
            {
                Debug.LogError("PdfPageDisplay: Target Renderer has no material and no pageMaterialTemplate was assigned.");
                return;
            }
        }

        _targetRenderer.gameObject.SetActive(false);
        _initialized = true;
    }

    private void OnDestroy()
    {
        if (_material != null && pageMaterialTemplate != null)
            Destroy(_material);

        if (_currentTexture != null)
            Destroy(_currentTexture);
    }
}