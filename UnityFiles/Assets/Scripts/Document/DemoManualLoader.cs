using UnityEngine;

public class DemoManualLoader : MonoBehaviour
{
    void Start()
    {
        if (ManualViewer.Instance == null) return;

        // Create 3 fake pages just to test
        Texture2D[] pages = new Texture2D[3];
        pages[0] = MakePage(new Color(0.9f, 0.9f, 1f));   // light blue
        pages[1] = MakePage(new Color(0.9f, 1f, 0.9f));   // light green
        pages[2] = MakePage(new Color(1f, 0.9f, 0.9f));   // light red

        ManualViewer.Instance.AddDocument("Demo Manual", pages);
    }

    Texture2D MakePage(Color color)
    {
        var tex = new Texture2D(512, 512);
        var pixels = new Color[512 * 512];
        for (int i = 0; i < pixels.Length; i++)
            pixels[i] = color;
        tex.SetPixels(pixels);
        tex.Apply();
        return tex;
    }
}