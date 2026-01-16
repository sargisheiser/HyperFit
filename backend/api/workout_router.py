"""Workout analysis endpoints and live WebSocket feed."""

from __future__ import annotations

import base64
import json
import time
from typing import Any, Dict, List, Optional

import cv2
import numpy as np
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status as http_status,
)
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db_session
from backend.models.user import User
from backend.models.workout import Workout, WorkoutAnalysisResult, WorkoutRead, WorkoutHistoryCreate
from backend.services.workout_service import analyze_workout_video, create_workout_history_entry

router = APIRouter()
ws_router = APIRouter()


class WorkoutAnalysisResponse(WorkoutAnalysisResult):
    workout: WorkoutRead
    video_asset: Dict[str, str]


def _serialize_workout(workout: Workout) -> WorkoutRead:
    return WorkoutRead.model_validate(workout)


@router.get("/history", response_model=List[WorkoutRead])
def list_workouts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> List[WorkoutRead]:
    """Return workout history for authenticated user."""
    from sqlalchemy.orm import joinedload

    workouts = (
        db.query(Workout)
        .options(joinedload(Workout.exercises))
        .filter(Workout.user_id == current_user.id)
        .order_by(Workout.created_at.desc())
        .all()
    )
    return [_serialize_workout(workout) for workout in workouts]


@router.post("/history", response_model=WorkoutRead, status_code=http_status.HTTP_201_CREATED)
def create_workout_history(
    payload: WorkoutHistoryCreate,
    current_user: User = Depends(get_current_user),
) -> WorkoutRead:
    """Create a manual workout log from a live session summary."""

    workout = create_workout_history_entry(current_user, payload)
    return _serialize_workout(workout)


@router.get("/history/{workout_id}", response_model=WorkoutRead)
def get_workout(
    workout_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> WorkoutRead:
    """Return a single workout session."""
    from sqlalchemy.orm import joinedload

    workout = (
        db.query(Workout)
        .options(joinedload(Workout.exercises))
        .filter(Workout.id == workout_id, Workout.user_id == current_user.id)
        .first()
    )
    if not workout:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Workout not found")
    return _serialize_workout(workout)


@router.post("/analyze", response_model=WorkoutAnalysisResponse)
async def analyze_workout_upload(
    file: UploadFile = File(...),
    workout_type: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
) -> WorkoutAnalysisResponse:
    """Analyze a recorded workout video and return AI-generated insights."""
    # File validation is handled in workout_service._store_video_file()

    workout, analysis, metadata = await analyze_workout_video(file, current_user, workout_type)

    return WorkoutAnalysisResponse(
        **analysis.model_dump(),
        workout=_serialize_workout(workout),
        video_asset=metadata,
    )


# --- Live workout WebSocket -------------------------------------------------


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: Dict[str, WebSocket] = {}
        self.state: Dict[str, Dict[str, Dict[str, float]]] = {}

    async def connect(self, websocket: WebSocket, user: Optional[User] = None) -> str:
        await websocket.accept()
        connection_id = f"user-{user.id if user else 'anon'}-{int(time.time())}"
        self.active_connections[connection_id] = websocket
        self.state[connection_id] = {
            "rep_counts": {},
            "last_exercise": None,
            "angles": {},
            "phase": {},
        }
        return connection_id

    def disconnect(self, connection_id: str) -> None:
        self.active_connections.pop(connection_id, None)
        self.state.pop(connection_id, None)

    async def send(self, connection_id: str, payload: Dict[str, Any]) -> None:
        websocket = self.active_connections.get(connection_id)
        if websocket:
            await websocket.send_json(payload)


manager = ConnectionManager()


def _decode_base64_image(base64_string: str) -> Optional[np.ndarray]:
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]
        image_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception:
        return None


async def _process_frame(connection_id: str, frame: np.ndarray) -> Dict[str, Any]:
    import mediapipe as mp
    import time
    from ai_modules.workout_tracking.mediapipe_service import get_workout_recognition_service

    service = get_workout_recognition_service()
    state = manager.state[connection_id]

    # Use new MediaPipe Tasks API
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)

    # Use actual time for monotonically increasing timestamps
    timestamp_ms = int(time.time() * 1000)

    results = service.landmarker.detect_for_video(mp_image, timestamp_ms)

    # Check if pose was detected
    if not results.pose_landmarks or len(results.pose_landmarks) == 0:
        return {
            "detected": False,
            "message": "Pose not detected",
            "rep_counts": state["rep_counts"],
            "exercise": state["last_exercise"],
        }

    # Get first detected pose landmarks
    pose_landmarks = results.pose_landmarks[0]

    exercise_info = service._detect_exercise_type(pose_landmarks, 0)
    exercise_name = exercise_info.get("name", "unknown")

    if exercise_name == "unknown":
        return {
            "detected": False,
            "message": "Exercise not recognized",
            "rep_counts": state["rep_counts"],
            "exercise": state["last_exercise"],
        }

    state["last_exercise"] = exercise_name
    angles = state.setdefault("angles", {}).setdefault(exercise_name, [])

    PoseLandmark = service.PoseLandmark
    angle = None

    # Calculate angle based on exercise type
    if exercise_name == "push-up":
        left_elbow = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ELBOW)
        left_shoulder = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_SHOULDER)
        left_wrist = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_WRIST)
        if left_elbow and left_shoulder and left_wrist:
            angle = service._calculate_angle(np.array(left_wrist), np.array(left_elbow), np.array(left_shoulder))

    elif exercise_name == "squat":
        left_hip = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_HIP)
        left_knee = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_KNEE)
        left_ankle = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ANKLE)
        if left_hip and left_knee and left_ankle:
            angle = service._calculate_angle(np.array(left_hip), np.array(left_knee), np.array(left_ankle))

    elif exercise_name == "bicep-curl":
        left_shoulder = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_SHOULDER)
        left_elbow = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ELBOW)
        left_wrist = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_WRIST)
        if left_shoulder and left_elbow and left_wrist:
            angle = service._calculate_angle(np.array(left_shoulder), np.array(left_elbow), np.array(left_wrist))

    elif exercise_name == "shoulder-press":
        left_hip = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_HIP)
        left_shoulder = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_SHOULDER)
        left_elbow = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ELBOW)
        if left_hip and left_shoulder and left_elbow:
            angle = service._calculate_angle(np.array(left_hip), np.array(left_shoulder), np.array(left_elbow))

    elif exercise_name == "lunge":
        left_hip = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_HIP)
        left_knee = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_KNEE)
        left_ankle = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ANKLE)
        if left_hip and left_knee and left_ankle:
            angle = service._calculate_angle(np.array(left_hip), np.array(left_knee), np.array(left_ankle))

    elif exercise_name == "lateral-raise":
        left_shoulder = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_SHOULDER)
        left_elbow = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_ELBOW)
        left_wrist = service._get_landmark_coords(pose_landmarks, PoseLandmark.LEFT_WRIST)
        if left_shoulder and left_elbow and left_wrist:
            angle = service._calculate_angle(np.array(left_shoulder), np.array(left_elbow), np.array(left_wrist))

    if angle is not None:
        angles.append(angle)
        if len(angles) > 20:
            angles.pop(0)

        # Define thresholds for each exercise (down_threshold, up_threshold)
        thresholds = {
            "push-up": (100, 150),
            "squat": (90, 160),
            "bicep-curl": (60, 140),      # Curl down at 60°, up at 140°
            "shoulder-press": (100, 160),  # Down at 100°, up at 160°
            "lunge": (90, 160),
            "lateral-raise": (40, 80),     # Arms down at 40°, raised at 80°
        }
        threshold_down, threshold_up = thresholds.get(exercise_name, (90, 150))

        state.setdefault("phase", {})
        phase = state["phase"].get(exercise_name, "up")

        if phase == "up" and angle < threshold_down:
            state["phase"][exercise_name] = "down"
        elif phase == "down" and angle > threshold_up:
            state["phase"][exercise_name] = "up"
            reps = state["rep_counts"].get(exercise_name, 0) + 1
            state["rep_counts"][exercise_name] = reps

    return {
        "detected": True,
        "exercise": exercise_name,
        "angle": angle,
        "rep_counts": state["rep_counts"],
        "confidence": exercise_info.get("confidence"),
    }


@ws_router.websocket("/ws/workout-live")
async def workout_live(
    websocket: WebSocket,
    token: Optional[str] = None,
):
    """Real-time pose tracking WebSocket."""

    user: Optional[User] = None
    if token:
        from backend.core.security import decode_access_token
        from backend.core.database import SessionLocal

        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.id == int(payload["sub"])).first()
            finally:
                db.close()

    connection_id = await manager.connect(websocket, user)

    try:
        await manager.send(
            connection_id,
            {
                "type": "connected",
                "message": "Connected to HyperFit live tracker",
            },
        )

        while True:
            payload = await websocket.receive_text()
            message = json.loads(payload)

            if message.get("type") == "frame":
                frame = _decode_base64_image(message.get("frame", ""))
                if frame is None:
                    continue
                result = await _process_frame(connection_id, frame)
                await manager.send(
                    connection_id,
                    {
                        "type": "analysis",
                        "timestamp": time.time(),
                        "result": result,
                    },
                )
            elif message.get("type") == "ping":
                await manager.send(connection_id, {"type": "pong", "timestamp": time.time()})
            elif message.get("type") == "reset":
                manager.state[connection_id] = {
                    "rep_counts": {},
                    "last_exercise": None,
                    "angles": {},
                    "phase": {},
                }
                await manager.send(connection_id, {"type": "reset_complete"})

    except WebSocketDisconnect:
        manager.disconnect(connection_id)
    except Exception:
        manager.disconnect(connection_id)
        raise


__all__ = ["router", "ws_router"]


