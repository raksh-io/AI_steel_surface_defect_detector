def test_dashboard_stats_empty(client, auth_headers):
    res = client.get("/api/dashboard/stats", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_inspections"] == 0
    assert data["total_defects"] == 0
    assert data["defect_rate"] == 0.0
    assert data["class_distribution"] == []
    assert data["recent_inspections"] == []


def test_dashboard_stats_unauthorized(client):
    res = client.get("/api/dashboard/stats")
    assert res.status_code in (401, 403)


def test_dashboard_analytics_empty(client, auth_headers):
    res = client.get("/api/dashboard/analytics", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_inspections"] == 0
    assert data["avg_confidence"] == 0.0
    assert len(data["confidence_histogram"]) == 5
    assert data["source_breakdown"] == []
    assert data["timeline"] == []


def test_dashboard_analytics_with_data(client, auth_headers, sample_image_bytes):
    from unittest.mock import patch
    import base64

    with patch("app.routers.inspections.run_inference") as mock_infer:
        mock_infer.return_value = {
            "class_name": "Patches",
            "class_index": 3,
            "confidence": 0.88,
            "gradcam_base64": base64.b64encode(b"dummy").decode("utf-8"),
            "original_base64": base64.b64encode(b"dummy").decode("utf-8"),
        }
        client.post(
            "/api/inspect/upload",
            files={"file": ("patch.jpg", sample_image_bytes, "image/jpeg")},
            headers=auth_headers,
        )

    res = client.get("/api/dashboard/analytics?days=30", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_inspections"] == 1
    assert data["total_defects"] == 1
    assert data["defect_rate"] == 1.0
    assert data["top_defect_class"] == "Patches"
    assert data["avg_confidence"] == 0.88
    assert len(data["timeline"]) == 1
    assert data["source_breakdown"][0]["name"] == "upload"

