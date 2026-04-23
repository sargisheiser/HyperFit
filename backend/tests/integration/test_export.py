"""Tests for the data export endpoints."""

import io
import uuid
import zipfile
from datetime import date


def _auth_headers(client):
    uid = uuid.uuid4().hex[:8]
    payload = {
        "email": f"export.{uid}@example.com",
        "username": f"user_{uid}",
        "password": "SecurePass123!",
        "full_name": "Export User",
        "birth_date": date(1990, 1, 1).isoformat(),
        "height_cm": 175,
        "weight_kg": 70,
        "gender": "male",
        "activity_level": "active",
        "fitness_goals": [],
        "dietary_preferences": [],
        "allergies": [],
    }
    client.post("/api/users/register", json=payload)
    login = client.post("/api/users/login", json={
        "email": payload["email"],
        "password": payload["password"],
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestJsonExport:

    def test_export_json_authenticated(self, client):
        headers = _auth_headers(client)
        resp = client.get("/api/export/json", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "workouts" in data
        assert "meals" in data
        assert "food_logs" in data
        assert "activities" in data
        assert "weight_logs" in data

    def test_export_json_unauthenticated(self, client):
        resp = client.get("/api/export/json")
        assert resp.status_code == 401

    def test_export_json_user_data_correct(self, client):
        headers = _auth_headers(client)
        resp = client.get("/api/export/json", headers=headers)
        data = resp.json()
        assert data["user"]["full_name"] == "Export User"
        assert data["user"]["height_cm"] == 175


class TestCsvExport:

    def test_export_csv_authenticated(self, client):
        headers = _auth_headers(client)
        resp = client.get("/api/export/csv", headers=headers)
        assert resp.status_code == 200
        assert "application/zip" in resp.headers["content-type"]

    def test_export_csv_contains_expected_files(self, client):
        headers = _auth_headers(client)
        resp = client.get("/api/export/csv", headers=headers)
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        names = zf.namelist()
        assert "meals.csv" in names
        assert "workouts.csv" in names
        assert "exercises.csv" in names

    def test_export_csv_unauthenticated(self, client):
        resp = client.get("/api/export/csv")
        assert resp.status_code == 401
