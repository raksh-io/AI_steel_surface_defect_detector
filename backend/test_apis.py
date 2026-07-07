import os
import sys
import time
import json
import uuid
import base64
import subprocess
import urllib.request
import urllib.error

API_URL = "http://127.0.0.1:8000"

def request_json(url, data=None, headers=None, method=None):
    if headers is None:
        headers = {}
    
    req_data = None
    if data is not None:
        if isinstance(data, (dict, list)):
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            req_data = data
            
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read()
            if resp.getheader("Content-Type", "").startswith("application/json"):
                return json.loads(resp_body.decode("utf-8")), resp.status
            return resp_body.decode("utf-8"), resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(err_body)
            return err_json, e.code
        except Exception:
            return err_body, e.code

def encode_multipart_formdata(fields, files):
    boundary = b'-----Boundary------'
    body = []
    for key, value in fields.items():
        body.append(b'--' + boundary)
        body.append(f'Content-Disposition: form-data; name="{key}"'.encode('utf-8'))
        body.append(b'')
        body.append(str(value).encode('utf-8'))
    for key, (filename, content, mimetype) in files.items():
        body.append(b'--' + boundary)
        body.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"'.encode('utf-8'))
        body.append(f'Content-Type: {mimetype}'.encode('utf-8'))
        body.append(b'')
        body.append(content)
    body.append(b'--' + boundary + b'--')
    body.append(b'')
    return b'\r\n'.join(body), f'multipart/form-data; boundary={boundary.decode("utf-8")}'

def test_all():
    print("=== Testing API endpoints ===")
    
    # 1. Health check
    print("Testing /health...")
    res, code = request_json(f"{API_URL}/health")
    assert code == 200, f"Health check failed with {code}: {res}"
    print("Health check OK:", res)
    
    # 2. Register user
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "SecurePassword123"
    name = "Test Inspector"
    print(f"Registering user with email {email}...")
    res, code = request_json(f"{API_URL}/api/auth/register", data={
        "email": email,
        "name": name,
        "password": password
    })
    assert code == 201, f"Registration failed: {res}"
    print("Registration OK:", res)
    
    # 3. Login
    print("Logging in...")
    res, code = request_json(f"{API_URL}/api/auth/login", data={
        "email": email,
        "password": password
    })
    assert code == 200, f"Login failed: {res}"
    token = res["access_token"]
    print("Login OK, received token starting with:", token[:20])
    
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # 4. Get profile
    print("Testing /api/auth/me...")
    res, code = request_json(f"{API_URL}/api/auth/me", headers=auth_headers)
    assert code == 200, f"Get profile failed: {res}"
    print("Profile OK:", res)
    
    # 5. Image upload
    print("Testing /api/inspect/upload...")
    sample_img_path = "../ai/data/NEU-DET/Crazing/crazing_1.jpg"
    if not os.path.exists(sample_img_path):
        sample_img_path = "d:/Personal_projects/AI_Steel_Surface_Defect_Detection/ai/data/NEU-DET/Crazing/crazing_1.jpg"
    
    with open(sample_img_path, "rb") as f:
        img_bytes = f.read()
    
    multipart_data, content_type = encode_multipart_formdata(
        fields={},
        files={"file": ("crazing_1.jpg", img_bytes, "image/jpeg")}
    )
    
    upload_headers = auth_headers.copy()
    upload_headers["Content-Type"] = content_type
    
    res, code = request_json(
        f"{API_URL}/api/inspect/upload",
        data=multipart_data,
        headers=upload_headers,
        method="POST"
    )
    assert code == 201, f"Upload failed: {res}"
    print("Upload OK!")
    print(f"  Inspection ID: {res['inspection_id']}")
    print(f"  Class: {res['defect_class']} (confidence: {res['confidence']})")
    print(f"  Grad-CAM image base64 length: {len(res['gradcam_base64'])}")
    inspection_id = res['inspection_id']
    
    # 6. Webcam frame
    print("Testing /api/inspect/webcam-frame...")
    # small white 1x1 png image base64 encoded
    dummy_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    
    # webcam-frame takes frame_b64 as form parameter
    webcam_data, webcam_content_type = encode_multipart_formdata(
        fields={"frame_b64": dummy_b64},
        files={}
    )
    webcam_headers = auth_headers.copy()
    webcam_headers["Content-Type"] = webcam_content_type
    res, code = request_json(
        f"{API_URL}/api/inspect/webcam-frame",
        data=webcam_data,
        headers=webcam_headers,
        method="POST"
    )
    assert code == 201, f"Webcam frame failed: {res}"
    print("Webcam frame OK!")
    print(f"  Class: {res['defect_class']} (confidence: {res['confidence']})")
    
    # 7. History list
    print("Testing /api/inspect/history...")
    res, code = request_json(f"{API_URL}/api/inspect/history", headers=auth_headers)
    assert code == 200, f"History list failed: {res}"
    print("History OK, item count:", len(res["items"]))
    
    # 8. Single history lookup
    print(f"Testing /api/inspect/history/{inspection_id}...")
    res, code = request_json(f"{API_URL}/api/inspect/history/{inspection_id}", headers=auth_headers)
    assert code == 200, f"History item lookup failed: {res}"
    print("History lookup OK:", res["defect_class"])
    
    # 9. Dashboard stats
    print("Testing /api/dashboard/stats...")
    res, code = request_json(f"{API_URL}/api/dashboard/stats", headers=auth_headers)
    assert code == 200, f"Dashboard stats failed: {res}"
    print("Dashboard OK:", res)
    
    print("\nSUCCESS: ALL ENDPOINTS WORKING SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
