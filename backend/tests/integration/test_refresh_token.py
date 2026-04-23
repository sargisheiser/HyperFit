"""Tests for the refresh token endpoint."""

import uuid
from datetime import date


def _create_user(client):
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"refresh.{uid}@example.com",
        "username": f"user_{uid}",
        "password": "SecurePass123!",
        "full_name": "Refresh User",
        "birth_date": date(1990, 1, 1).isoformat(),
        "height_cm": 175,
        "weight_kg": 70,
        "gender": "male",
        "activity_level": "active",
        "fitness_goals": [],
        "dietary_preferences": [],
        "allergies": [],
    }
    reg = client.post("/api/users/register", json=payload)
    assert reg.status_code == 201
    login = client.post("/api/users/login", json={
        "email": payload["email"],
        "password": payload["password"],
    })
    assert login.status_code == 200
    return login.json()


class TestRefreshToken:

    def test_login_returns_refresh_token(self, client):
        data = _create_user(client)
        assert "refresh_token" in data
        assert len(data["refresh_token"]) > 0

    def test_refresh_returns_new_tokens(self, client):
        data = _create_user(client)
        resp = client.post("/api/users/refresh", json={
            "refresh_token": data["refresh_token"],
        })
        assert resp.status_code == 200
        new_data = resp.json()
        assert "access_token" in new_data
        assert "refresh_token" in new_data
        assert new_data["token_type"] == "bearer"
        assert new_data["expires_in"] > 0

    def test_refresh_new_access_token_works(self, client):
        data = _create_user(client)
        resp = client.post("/api/users/refresh", json={
            "refresh_token": data["refresh_token"],
        })
        new_token = resp.json()["access_token"]
        profile = client.get("/api/users/me", headers={
            "Authorization": f"Bearer {new_token}",
        })
        assert profile.status_code == 200

    def test_refresh_with_invalid_token(self, client):
        resp = client.post("/api/users/refresh", json={
            "refresh_token": "invalid.token.here",
        })
        assert resp.status_code == 401

    def test_refresh_with_access_token_fails(self, client):
        data = _create_user(client)
        resp = client.post("/api/users/refresh", json={
            "refresh_token": data["access_token"],
        })
        assert resp.status_code == 401

    def test_refresh_with_empty_token(self, client):
        resp = client.post("/api/users/refresh", json={
            "refresh_token": "",
        })
        assert resp.status_code == 401
