using System;
using System.Text;
using Newtonsoft.Json.Linq;
using Unity.WebRTC;
using UnityEngine;

public class DocumentNavigationChannel : MonoBehaviour
{
    private RTCDataChannel _dataChannel;

    public void SetDataChannel(RTCDataChannel dataChannel)
    {
        _dataChannel = dataChannel;
    }


    public bool SendNavigate(DocumentNavigateMessage message)
    {
        return SendMessage("document-navigate", message);
    }

    private bool SendMessage(string type, object payload)
    {
        var root = JObject.FromObject(payload ?? new object());
        root["type"] = type;
        var json = root.ToString(Newtonsoft.Json.Formatting.None);

        if (_dataChannel == null)
        {
            Debug.LogWarning($"DocumentNavigationChannel: data channel unavailable; outbound payload not sent. type='{type}'.");
            return false;
        }

        _dataChannel.Send(Encoding.UTF8.GetBytes(json));
        return true;
    }
}