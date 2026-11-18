def test_register_success(client):
    res = client.post(
        "/api/auth/register",
        json={
            "email": "new_inspector@steel.com",
            "name": "Jane Doe",
            "password": "SecurePassword999",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "new_inspector@steel.com"
    assert data["name"] == "Jane Doe"
    assert "id" in data


def test_register_duplicate_email(client, test_user):
    res = client.post(
        "/api/auth/register",
        json={
            "email": test_user.email,
            "name": "Impostor",
            "password": "SecurePassword999",
        },
    )
    assert res.status_code == 409


def test_login_success(client, test_user):
    res = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "TestPassword123!",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["email"] == test_user.email


def test_login_invalid_password(client, test_user):
    res = client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "WrongPassword!",
        },
    )
    assert res.status_code == 401


def test_get_me(client, auth_headers, test_user):
    res = client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name


def test_get_me_unauthorized(client):
    res = client.get("/api/auth/me")
    assert res.status_code in (401, 403)


def test_update_profile(client, auth_headers):
    res = client.put(
        "/api/auth/profile",
        json={"name": "Updated Inspector Name"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Updated Inspector Name"


def test_change_password(client, auth_headers):
    res = client.post(
        "/api/auth/change-password",
        json={
            "current_password": "TestPassword123!",
            "new_password": "BrandNewPassword123",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Password changed successfully"
