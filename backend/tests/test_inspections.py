import base64
from unittest.mock import patch


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "version": "1.0.0"}


def test_upload_image_unauthorized(client, sample_image_bytes):
    res = client.post(
        "/api/inspect/upload",
        files={"file": ("test.jpg", sample_image_bytes, "image/jpeg")},
    )
    assert res.status_code in (401, 403)


def test_upload_invalid_mime(client, auth_headers):
    res = client.post(
        "/api/inspect/upload",
        files={"file": ("document.txt", b"plain text content", "text/plain")},
        headers=auth_headers,
    )
    assert res.status_code == 415


@patch("app.routers.inspections.run_inference")
def test_upload_image_success(mock_infer, client, auth_headers, sample_image_bytes):
    mock_infer.return_value = {
        "class_name": "Crazing",
        "class_index": 0,
        "confidence": 0.985,
        "gradcam_base64": base64.b64encode(b"fake_gradcam").decode("utf-8"),
        "original_base64": base64.b64encode(b"fake_original").decode("utf-8"),
    }

    res = client.post(
        "/api/inspect/upload",
        files={"file": ("test_steel.jpg", sample_image_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["defect_class"] == "Crazing"
    assert data["confidence"] == 0.985
    assert data["is_defect"] is True
    assert "inspection_id" in data


@patch("app.routers.inspections.run_inference")
def test_webcam_frame_success(mock_infer, client, auth_headers, sample_image_bytes):
    mock_infer.return_value = {
        "class_name": "Patches",
        "class_index": 3,
        "confidence": 0.94,
        "gradcam_base64": base64.b64encode(b"fake_gradcam").decode("utf-8"),
        "original_base64": base64.b64encode(b"fake_original").decode("utf-8"),
    }

    raw_b64 = "data:image/jpeg;base64," + base64.b64encode(sample_image_bytes).decode("utf-8")
    res = client.post(
        "/api/inspect/webcam-frame",
        data={"frame_b64": raw_b64},
        headers=auth_headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["defect_class"] == "Patches"
    assert data["source"] == "webcam"


@patch("app.routers.inspections.run_inference")
def test_history_and_delete(mock_infer, client, auth_headers, sample_image_bytes):
    mock_infer.return_value = {
        "class_name": "Scratches",
        "class_index": 5,
        "confidence": 0.96,
        "gradcam_base64": base64.b64encode(b"fake_gradcam").decode("utf-8"),
        "original_base64": base64.b64encode(b"fake_original").decode("utf-8"),
    }

    # Create an inspection
    res_upload = client.post(
        "/api/inspect/upload",
        files={"file": ("steel_scratch.jpg", sample_image_bytes, "image/jpeg")},
        headers=auth_headers,
    )
    assert res_upload.status_code == 201
    insp_id = res_upload.json()["inspection_id"]

    # Fetch history
    res_hist = client.get("/api/inspect/history", headers=auth_headers)
    assert res_hist.status_code == 200
    hist_data = res_hist.json()
    assert hist_data["total"] >= 1
    assert any(item["id"] == insp_id for item in hist_data["items"])

    # Fetch single inspection
    res_single = client.get(f"/api/inspect/history/{insp_id}", headers=auth_headers)
    assert res_single.status_code == 200
    assert res_single.json()["defect_class"] == "Scratches"

    # Delete inspection
    res_del = client.delete(f"/api/inspect/history/{insp_id}", headers=auth_headers)
    assert res_del.status_code == 204

    # Verify deleted
    res_single_after = client.get(f"/api/inspect/history/{insp_id}", headers=auth_headers)
    assert res_single_after.status_code == 404
