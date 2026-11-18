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
