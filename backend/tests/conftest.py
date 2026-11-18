import os
import sys
from io import BytesIO
import pytest
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from unittest.mock import patch
# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base, get_db
from app.main import app
from app.auth import create_user, create_access_token

# Use SQLite in-memory for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def mock_external_services():
    with patch("app.storage.upload_image_data", return_value="mocked_storage_file.png"), \
         patch("app.main.load_model", return_value=None):
        yield


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    user = create_user(
        db_session,
        email="inspector@steelcorp.com",
        name="Chief Inspector",
        password="TestPassword123!",
    )
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_image_bytes():
    """Generate a valid sample image in memory."""
    img = Image.new("RGB", (224, 224), color=(128, 128, 128))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()
