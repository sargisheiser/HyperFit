"""
MediaPipe Workout Recognition Service
Uses MediaPipe Pose for exercise detection and rep counting.
Updated to use MediaPipe Tasks API (0.10.30+).
"""

import logging
import time
import urllib.request
from enum import IntEnum
from pathlib import Path
from typing import Any

import cv2

# MediaPipe Tasks API imports
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Pose landmark indices (matching the old PoseLandmark enum)
class PoseLandmark(IntEnum):
    NOSE = 0
    LEFT_EYE_INNER = 1
    LEFT_EYE = 2
    LEFT_EYE_OUTER = 3
    RIGHT_EYE_INNER = 4
    RIGHT_EYE = 5
    RIGHT_EYE_OUTER = 6
    LEFT_EAR = 7
    RIGHT_EAR = 8
    MOUTH_LEFT = 9
    MOUTH_RIGHT = 10
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_PINKY = 17
    RIGHT_PINKY = 18
    LEFT_INDEX = 19
    RIGHT_INDEX = 20
    LEFT_THUMB = 21
    RIGHT_THUMB = 22
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    LEFT_HEEL = 29
    RIGHT_HEEL = 30
    LEFT_FOOT_INDEX = 31
    RIGHT_FOOT_INDEX = 32


class WorkoutRecognitionService:
    """Service for analyzing workout videos using MediaPipe Pose."""

    MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task"
    MODEL_FILENAME = "pose_landmarker_heavy.task"

    def __init__(self):
        """Initialize MediaPipe Pose Landmarker with optimized settings."""
        # Ensure model is downloaded
        model_path = self._ensure_model_downloaded()

        # Create PoseLandmarker options
        base_options = python.BaseOptions(model_asset_path=model_path)
        options = vision.PoseLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.VIDEO,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_segmentation_masks=False
        )

        self.landmarker = vision.PoseLandmarker.create_from_options(options)
        self.PoseLandmark = PoseLandmark  # Use our enum for compatibility
        logger.info("MediaPipe Pose Landmarker initialized (heavy model)")

    def _ensure_model_downloaded(self) -> str:
        """Download the pose landmarker model if not present."""
        import ssl

        import certifi

        # Store in the ai_modules/workout_tracking directory
        model_dir = Path(__file__).parent / "models"
        model_dir.mkdir(exist_ok=True)
        model_path = model_dir / self.MODEL_FILENAME

        if not model_path.exists():
            logger.info(f"Downloading pose landmarker model to {model_path}...")
            try:
                # Create SSL context with certifi certificates
                ssl_context = ssl.create_default_context(cafile=certifi.where())
                opener = urllib.request.build_opener(
                    urllib.request.HTTPSHandler(context=ssl_context)
                )
                urllib.request.install_opener(opener)
                urllib.request.urlretrieve(self.MODEL_URL, str(model_path))
                logger.info("Model downloaded successfully")
            except Exception as e:
                logger.error(f"Failed to download model: {e}")
                # Try with unverified context as fallback (development only)
                try:
                    logger.warning("Retrying download with unverified SSL context...")
                    ssl_context = ssl.create_default_context()
                    ssl_context.check_hostname = False
                    ssl_context.verify_mode = ssl.CERT_NONE
                    opener = urllib.request.build_opener(
                        urllib.request.HTTPSHandler(context=ssl_context)
                    )
                    urllib.request.install_opener(opener)
                    urllib.request.urlretrieve(self.MODEL_URL, str(model_path))
                    logger.info("Model downloaded successfully (unverified SSL)")
                except Exception as e2:
                    logger.error(f"Failed to download model (unverified): {e2}")
                    raise RuntimeError(f"Could not download MediaPipe model: {e}")

        return str(model_path)

    def _calculate_angle(self, point1: np.ndarray, point2: np.ndarray, point3: np.ndarray) -> float:
        """Calculate angle between three points."""
        a = np.array(point1)
        b = np.array(point2)  # Vertex
        c = np.array(point3)

        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)

        if angle > 180.0:
            angle = 360 - angle

        return angle

    def _get_landmark_coords(self, landmarks, index: int) -> tuple[float, float] | None:
        """Get landmark coordinates by index.

        Works with both old format (landmarks.landmark) and new Tasks API format (list of landmarks).
        """
        if landmarks is None:
            return None

        # New Tasks API format: landmarks is a list directly
        if isinstance(landmarks, list):
            if len(landmarks) > index:
                landmark = landmarks[index]
                return (landmark.x, landmark.y)
            return None

        # Old format compatibility (landmarks.landmark)
        if hasattr(landmarks, 'landmark') and len(landmarks.landmark) > index:
            landmark = landmarks.landmark[index]
            return (landmark.x, landmark.y)

        return None

    def _get_landmark_visibility(self, landmarks, index: int) -> float:
        """Get landmark visibility score."""
        if landmarks is None:
            return 0.0

        # New Tasks API format
        if isinstance(landmarks, list):
            if len(landmarks) > index:
                return landmarks[index].visibility if hasattr(landmarks[index], 'visibility') else 1.0
            return 0.0

        # Old format compatibility
        if hasattr(landmarks, 'landmark') and len(landmarks.landmark) > index:
            return landmarks.landmark[index].visibility

        return 0.0

    def _detect_exercise_type(self, landmarks, frame_count: int) -> dict[str, Any]:
        """Detect exercise type based on pose landmarks with improved accuracy."""
        # Get all key landmarks with visibility check
        left_shoulder = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_SHOULDER)
        right_shoulder = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_SHOULDER)
        left_elbow = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_ELBOW)
        right_elbow = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_ELBOW)
        left_wrist = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_WRIST)
        right_wrist = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_WRIST)
        left_hip = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_HIP)
        right_hip = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_HIP)
        left_knee = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_KNEE)
        right_knee = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_KNEE)
        left_ankle = self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_ANKLE)
        right_ankle = self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_ANKLE)
        self._get_landmark_coords(landmarks, self.PoseLandmark.LEFT_EAR)
        self._get_landmark_coords(landmarks, self.PoseLandmark.RIGHT_EAR)
        nose = self._get_landmark_coords(landmarks, self.PoseLandmark.NOSE)

        # Check visibility of landmarks
        def get_visibility(landmark_idx):
            if landmarks and len(landmarks.landmark) > landmark_idx:
                return landmarks.landmark[landmark_idx].visibility
            return 0.0

        # Require minimum visibility for key points
        if not all([left_shoulder, right_shoulder, left_hip, right_hip]):
            return {"name": "unknown", "confidence": 0.0}

        # Calculate body orientation and key metrics
        shoulder_center_y = (left_shoulder[1] + right_shoulder[1]) / 2
        hip_center_y = (left_hip[1] + right_hip[1]) / 2
        shoulder_center_x = (left_shoulder[0] + right_shoulder[0]) / 2
        hip_center_x = (left_hip[0] + right_hip[0]) / 2

        # Body vertical alignment (for push-ups detection)
        body_vertical_alignment = abs(shoulder_center_x - hip_center_x)

        # Detect PUSH-UPS with improved logic
        if left_elbow and right_elbow and left_wrist and right_wrist and left_shoulder and right_shoulder:
            avg_wrist_y = (left_wrist[1] + right_wrist[1]) / 2
            avg_elbow_y = (left_elbow[1] + right_elbow[1]) / 2

            # Wrists should be below shoulders (push-up position)
            wrist_below_shoulder = avg_wrist_y > shoulder_center_y + 0.05

            # Elbows should be below shoulders
            elbow_below_shoulder = avg_elbow_y > shoulder_center_y

            # Calculate elbow angles
            left_elbow_angle = None
            right_elbow_angle = None

            if left_elbow and left_shoulder and left_wrist:
                left_elbow_angle = self._calculate_angle(left_wrist, left_elbow, left_shoulder)

            if right_elbow and right_shoulder and right_wrist:
                right_elbow_angle = self._calculate_angle(right_wrist, right_elbow, right_shoulder)

            # Check if elbows are bent (push-up position)
            elbows_bent = False
            if left_elbow_angle and right_elbow_angle:
                elbows_bent = (left_elbow_angle < 160 and right_elbow_angle < 160)
            elif left_elbow_angle:
                elbows_bent = left_elbow_angle < 160
            elif right_elbow_angle:
                elbows_bent = right_elbow_angle < 160

            # Body should be relatively horizontal (not standing)
            body_angle = abs(hip_center_y - shoulder_center_y)
            horizontal_body = body_angle < 0.15  # Body is relatively horizontal

            # Push-up detection criteria
            if wrist_below_shoulder and (elbow_below_shoulder or elbows_bent) and horizontal_body:
                # Calculate confidence based on angle
                confidence = 0.7
                if left_elbow_angle and right_elbow_angle:
                    avg_angle = (left_elbow_angle + right_elbow_angle) / 2
                    if 70 < avg_angle < 150:  # Good push-up range
                        confidence = 0.9
                elif left_elbow_angle:
                    if 70 < left_elbow_angle < 150:
                        confidence = 0.85

                return {"name": "push-up", "confidence": confidence, "angle": left_elbow_angle or right_elbow_angle}

        # Detect BICEP CURLS (standing bar / dumbbell curls)
        if left_elbow and right_elbow and left_wrist and right_wrist and left_shoulder and right_shoulder:
            # Body should be mostly upright (relaxed threshold)
            body_vertical = body_vertical_alignment < 0.15

            # Shoulders should be above hips (standing position)
            standing_upright = shoulder_center_y < hip_center_y

            # Calculate elbow angles for curl detection
            left_curl_angle = None
            right_curl_angle = None
            if left_shoulder and left_elbow and left_wrist:
                left_curl_angle = self._calculate_angle(left_shoulder, left_elbow, left_wrist)
            if right_shoulder and right_elbow and right_wrist:
                right_curl_angle = self._calculate_angle(right_shoulder, right_elbow, right_wrist)

            # Determine if at least one arm is in curling position
            curl_detected = False
            angles_to_consider = []
            for angle in (left_curl_angle, right_curl_angle):
                if angle is None:
                    continue
                angles_to_consider.append(angle)
                # Curl position: arm bent between 30-150 degrees
                if 30 <= angle <= 150:
                    curl_detected = True

            # Simplified detection: standing + arm bent in curl range
            if standing_upright and body_vertical and curl_detected:
                confidence = 0.7
                if angles_to_consider:
                    avg_angle = sum(angles_to_consider) / len(angles_to_consider)
                    # Higher confidence for clear curl positions
                    if 40 <= avg_angle <= 120:
                        confidence = 0.9
                    elif 30 <= avg_angle <= 140:
                        confidence = 0.8
                return {
                    "name": "bicep-curl",
                    "confidence": confidence,
                    "angle": np.mean(angles_to_consider) if angles_to_consider else None,
                }

        # Detect SQUATS with improved logic
        if left_knee and right_knee and left_hip and right_hip and left_ankle and right_ankle:
            # Calculate knee angles - primary indicator for squats
            left_knee_angle = None
            right_knee_angle = None

            if left_hip and left_knee and left_ankle:
                left_knee_angle = self._calculate_angle(left_hip, left_knee, left_ankle)

            if right_hip and right_knee and right_ankle:
                right_knee_angle = self._calculate_angle(right_hip, right_knee, right_ankle)

            # Shoulders should be above hips (upright position)
            standing_position = shoulder_center_y < hip_center_y

            # Body should be mostly vertical (relaxed threshold)
            body_vertical = body_vertical_alignment < 0.2

            # Knees should be bent - this is the main squat indicator
            knees_bent = False
            avg_knee_angle = None
            if left_knee_angle and right_knee_angle:
                avg_knee_angle = (left_knee_angle + right_knee_angle) / 2
                knees_bent = avg_knee_angle < 160  # More relaxed threshold
            elif left_knee_angle:
                avg_knee_angle = left_knee_angle
                knees_bent = left_knee_angle < 160
            elif right_knee_angle:
                avg_knee_angle = right_knee_angle
                knees_bent = right_knee_angle < 160

            # Squat detection: standing position with bent knees
            if standing_position and body_vertical and knees_bent:
                confidence = 0.65
                if avg_knee_angle:
                    # Higher confidence for deeper squats
                    if 50 <= avg_knee_angle <= 120:  # Deep squat
                        confidence = 0.95
                    elif 60 <= avg_knee_angle <= 140:  # Medium squat
                        confidence = 0.85
                    elif avg_knee_angle < 160:  # Partial squat
                        confidence = 0.75

                return {"name": "squat", "confidence": confidence, "angle": avg_knee_angle}

        # Detect PLANK with improved logic
        if left_shoulder and right_shoulder and left_hip and right_hip:
            # Check if body is horizontal
            shoulder_hip_diff = abs(shoulder_center_y - hip_center_y)
            horizontal_body = shoulder_hip_diff < 0.08  # Body is horizontal

            # Check if wrists/elbows are on ground (below shoulders)
            wrists_on_ground = False
            if left_wrist and right_wrist:
                avg_wrist_y = (left_wrist[1] + right_wrist[1]) / 2
                wrists_on_ground = avg_wrist_y > shoulder_center_y + 0.05
            elif left_elbow and right_elbow:
                avg_elbow_y = (left_elbow[1] + right_elbow[1]) / 2
                wrists_on_ground = avg_elbow_y > shoulder_center_y + 0.05

            # Toes should be visible (for full plank)
            if left_ankle and right_ankle:
                (left_ankle[1] + right_ankle[1]) / 2

            # Plank detection
            if horizontal_body and (wrists_on_ground or (left_elbow and right_elbow)):
                # Check if body is straight
                body_straight = shoulder_hip_diff < 0.1
                confidence = 0.6

                if body_straight and wrists_on_ground:
                    confidence = 0.85
                elif body_straight:
                    confidence = 0.75

                return {"name": "plank", "confidence": confidence}

        # Detect LUNGES
        if left_knee and right_knee and left_hip and right_hip and left_ankle and right_ankle:
            # One knee should be significantly lower than the other
            knee_diff = abs(left_knee[1] - right_knee[1])

            # Calculate knee angles
            left_knee_angle = None
            right_knee_angle = None

            if left_hip and left_knee and left_ankle:
                left_knee_angle = self._calculate_angle(left_hip, left_knee, left_ankle)
            if right_hip and right_knee and right_ankle:
                right_knee_angle = self._calculate_angle(right_hip, right_knee, right_ankle)

            # Lunge detection: one knee bent more than the other, significant height difference
            if knee_diff > 0.08 and left_knee_angle and right_knee_angle:
                front_knee_bent = min(left_knee_angle, right_knee_angle) < 120
                back_knee_bent = max(left_knee_angle, right_knee_angle) > 90

                if front_knee_bent and back_knee_bent:
                    confidence = 0.75
                    if min(left_knee_angle, right_knee_angle) < 100:
                        confidence = 0.9
                    return {"name": "lunge", "confidence": confidence, "angle": min(left_knee_angle, right_knee_angle)}

        # Detect SHOULDER PRESS
        if left_shoulder and right_shoulder and left_elbow and right_elbow and left_wrist and right_wrist:
            # Arms should be raised above shoulders
            avg_wrist_y = (left_wrist[1] + right_wrist[1]) / 2
            wrists_above_shoulders = avg_wrist_y < shoulder_center_y

            # Elbows should be at or above shoulder level
            avg_elbow_y = (left_elbow[1] + right_elbow[1]) / 2
            elbows_raised = avg_elbow_y < shoulder_center_y + 0.1

            # Body should be mostly vertical (relaxed)
            body_vertical = body_vertical_alignment < 0.15

            # Standing position
            standing_upright = shoulder_center_y < hip_center_y

            # Calculate shoulder angles
            left_shoulder_angle = self._calculate_angle(left_hip, left_shoulder, left_elbow) if left_hip else None
            right_shoulder_angle = self._calculate_angle(right_hip, right_shoulder, right_elbow) if right_hip else None

            if standing_upright and body_vertical and (wrists_above_shoulders or elbows_raised):
                if left_shoulder_angle and right_shoulder_angle:
                    avg_angle = (left_shoulder_angle + right_shoulder_angle) / 2
                    if avg_angle > 80:  # Arms raised
                        confidence = 0.85 if avg_angle > 140 else 0.75
                        return {"name": "shoulder-press", "confidence": confidence, "angle": avg_angle}

        # Detect LATERAL RAISE
        if left_shoulder and right_shoulder and left_elbow and right_elbow and left_wrist and right_wrist:
            # Arms should be extended to the sides
            arm_spread = abs(left_wrist[0] - right_wrist[0])
            shoulder_spread = abs(left_shoulder[0] - right_shoulder[0])

            # Arms wider than shoulders (relaxed threshold)
            arms_spread_wide = arm_spread > shoulder_spread * 1.3

            # Wrists at or near shoulder height (relaxed)
            avg_wrist_y = (left_wrist[1] + right_wrist[1]) / 2
            wrists_at_shoulder_height = abs(avg_wrist_y - shoulder_center_y) < 0.2

            # Arms relatively straight (relaxed)
            left_elbow_angle = self._calculate_angle(left_shoulder, left_elbow, left_wrist)
            right_elbow_angle = self._calculate_angle(right_shoulder, right_elbow, right_wrist)
            arms_straight = left_elbow_angle > 120 and right_elbow_angle > 120

            # Body mostly vertical and standing
            body_vertical = body_vertical_alignment < 0.15
            standing_upright = shoulder_center_y < hip_center_y

            if standing_upright and body_vertical and arms_spread_wide and wrists_at_shoulder_height:
                confidence = 0.8
                if arms_straight:
                    confidence = 0.9
                return {"name": "lateral-raise", "confidence": confidence, "angle": (left_elbow_angle + right_elbow_angle) / 2}

        # Detect TRICEP DIP
        if left_shoulder and right_shoulder and left_elbow and right_elbow and left_wrist and right_wrist:
            # Wrists should be behind/beside body
            avg_wrist_x = (left_wrist[0] + right_wrist[0]) / 2
            wrists_beside_body = abs(avg_wrist_x - shoulder_center_x) < 0.2

            # Elbows bent behind body
            avg_elbow_y = (left_elbow[1] + right_elbow[1]) / 2
            elbows_behind = avg_elbow_y > shoulder_center_y

            # Calculate elbow angles
            left_elbow_angle = self._calculate_angle(left_shoulder, left_elbow, left_wrist)
            right_elbow_angle = self._calculate_angle(right_shoulder, right_elbow, right_wrist)

            if wrists_beside_body and elbows_behind and left_elbow_angle and right_elbow_angle:
                avg_angle = (left_elbow_angle + right_elbow_angle) / 2
                if 60 < avg_angle < 150:
                    confidence = 0.75 if avg_angle < 120 else 0.6
                    return {"name": "tricep-dip", "confidence": confidence, "angle": avg_angle}

        # Detect CRUNCH / SIT-UP
        if left_shoulder and right_shoulder and left_hip and right_hip:
            # Body should be on ground (horizontal) but curling up
            shoulder_hip_diff = abs(shoulder_center_y - hip_center_y)

            # Check if nose/head is moving toward knees
            if nose and left_knee and right_knee:
                avg_knee_y = (left_knee[1] + right_knee[1]) / 2
                head_toward_knees = nose[1] > shoulder_center_y and nose[1] < avg_knee_y

                # Shoulders off ground but hips still down
                shoulders_lifted = shoulder_center_y < hip_center_y

                if shoulders_lifted and shoulder_hip_diff < 0.2:
                    confidence = 0.7
                    if head_toward_knees:
                        confidence = 0.85
                    return {"name": "crunch", "confidence": confidence}

        # Detect JUMPING JACK (arms and legs spread)
        if left_shoulder and right_shoulder and left_wrist and right_wrist and left_ankle and right_ankle:
            # Arms spread wide and raised
            arm_spread = abs(left_wrist[0] - right_wrist[0])
            shoulder_spread = abs(left_shoulder[0] - right_shoulder[0])
            arms_wide = arm_spread > shoulder_spread * 2

            # Wrists above shoulders
            avg_wrist_y = (left_wrist[1] + right_wrist[1]) / 2
            arms_raised = avg_wrist_y < shoulder_center_y

            # Legs spread wide
            leg_spread = abs(left_ankle[0] - right_ankle[0])
            hip_spread = abs(left_hip[0] - right_hip[0]) if left_hip and right_hip else 0.1
            legs_wide = leg_spread > hip_spread * 1.5

            body_vertical = body_vertical_alignment < 0.1

            if body_vertical and arms_wide and arms_raised and legs_wide:
                confidence = 0.8
                return {"name": "jumping-jack", "confidence": confidence}

        # Detect STANDING / READY position
        if left_shoulder and right_shoulder and left_hip and right_hip:
            body_vertical = body_vertical_alignment < 0.1
            shoulder_hip_diff = abs(shoulder_center_y - hip_center_y)

            if body_vertical and shoulder_hip_diff > 0.15:  # Standing upright
                return {"name": "ready", "confidence": 0.5}

        return {"name": "unknown", "confidence": 0.2}

    def _count_reps_with_stage(self, exercise_type: str, angles_history: list[float]) -> tuple[int, str]:
        """
        Count repetitions using stage-based tracking (improved accuracy).
        Returns: (rep_count, current_stage)
        """
        if len(angles_history) < 5:
            return 0, "Unknown"

        reps = 0
        stage = None

        # Define thresholds based on exercise type
        if exercise_type == "bicep-curl":
            threshold_down = 160  # Arm extended (down position)
            threshold_up = 45     # Arm curled (up position)
        elif exercise_type == "push-up":
            threshold_down = 90   # Down position
            threshold_up = 160    # Up position
        elif exercise_type == "squat":
            threshold_down = 120  # Down position
            threshold_up = 170    # Up position
        elif exercise_type == "lunge":
            threshold_down = 100  # Down position (front knee bent)
            threshold_up = 160    # Up position (standing)
        elif exercise_type == "shoulder-press":
            threshold_down = 90   # Down position (elbows at shoulders)
            threshold_up = 170    # Up position (arms extended)
        elif exercise_type == "lateral-raise":
            threshold_down = 30   # Down position (arms at sides)
            threshold_up = 80     # Up position (arms at shoulder height)
        elif exercise_type == "tricep-dip":
            threshold_down = 90   # Down position (elbows bent)
            threshold_up = 160    # Up position (arms extended)
        elif exercise_type == "crunch":
            threshold_down = 150  # Down position (lying flat)
            threshold_up = 100    # Up position (crunched)
        elif exercise_type == "jumping-jack":
            threshold_down = 30   # Down position (arms at sides)
            threshold_up = 150    # Up position (arms raised)
        else:
            threshold_down = 120
            threshold_up = 170

        # Process angles with stage tracking
        for angle in angles_history:
            if angle > threshold_down:
                stage = "Down"
            elif angle < threshold_up and stage == "Down":
                stage = "Up"
                reps += 1

        # Determine current stage from last angle
        if angles_history:
            last_angle = angles_history[-1]
            if last_angle > threshold_down:
                current_stage = "Down"
            elif last_angle < threshold_up:
                current_stage = "Up"
            else:
                current_stage = stage or "Unknown"
        else:
            current_stage = stage or "Unknown"

        return reps, current_stage

    def _count_reps(self, exercise_type: str, angles_history: list[float]) -> int:
        """Count repetitions based on angle history (legacy method for compatibility)."""
        reps, _ = self._count_reps_with_stage(exercise_type, angles_history)
        return reps

    async def analyze_workout_video(
        self,
        video_path: str,
        workout_type: str | None = None
    ) -> dict[str, Any]:
        """
        Analyze a workout video and extract exercise information.

        Args:
            video_path: Path to the workout video
            workout_type: Optional workout type hint

        Returns:
            Dictionary with detected exercises, reps, and analysis details
        """
        start_time = time.time()

        try:
            logger.info(f"Starting workout analysis for: {video_path}")

            # Open video
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")

            fps = int(cap.get(cv2.CAP_PROP_FPS))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0

            detected_exercises = []
            exercise_history = {}  # Track exercises across frames
            angles_history = {exercise: [] for exercise in [
                "push-up", "squat", "plank", "bicep-curl", "lunge",
                "shoulder-press", "lateral-raise", "tricep-dip", "crunch", "jumping-jack"
            ]}

            frame_num = 0
            exercises_detected = set()

            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                frame_num += 1

                # Process every 5th frame for performance
                if frame_num % 5 != 0:
                    continue

                # Convert BGR to RGB
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Create MediaPipe Image and process with new Tasks API
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                timestamp_ms = int((frame_num / fps) * 1000) if fps > 0 else frame_num
                results = self.landmarker.detect_for_video(mp_image, timestamp_ms)

                # Check if pose was detected (new API returns list)
                if results.pose_landmarks and len(results.pose_landmarks) > 0:
                    # Get first detected pose landmarks
                    pose_landmarks = results.pose_landmarks[0]
                    # Detect exercise type
                    exercise_info = self._detect_exercise_type(pose_landmarks, frame_num)

                    if exercise_info["name"] != "unknown":
                        exercise_name = exercise_info["name"]
                        exercises_detected.add(exercise_name)

                        # Track exercise
                        if exercise_name not in exercise_history:
                            exercise_history[exercise_name] = {
                                "count": 0,
                                "frames": [],
                                "angles": []
                            }

                        exercise_history[exercise_name]["frames"].append(frame_num)

                        # Calculate angles for rep counting
                        angle = None
                        if exercise_name == "push-up":
                            left_elbow = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_ELBOW
                            )
                            left_shoulder = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_SHOULDER
                            )
                            left_wrist = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_WRIST
                            )

                            if left_elbow and left_shoulder and left_wrist:
                                angle = self._calculate_angle(
                                    np.array(left_wrist),
                                    np.array(left_elbow),
                                    np.array(left_shoulder)
                                )
                                angles_history["push-up"].append(angle)

                        elif exercise_name == "squat":
                            left_hip = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_HIP
                            )
                            left_knee = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_KNEE
                            )
                            left_ankle = self._get_landmark_coords(
                                pose_landmarks,
                                self.PoseLandmark.LEFT_ANKLE
                            )

                            if left_hip and left_knee and left_ankle:
                                angle = self._calculate_angle(
                                    np.array(left_hip),
                                    np.array(left_knee),
                                    np.array(left_ankle)
                                )
                                angles_history["squat"].append(angle)

                        elif exercise_name == "bicep-curl":
                            # Improved bicep curl detection using left arm (or right if left not available)
                            left_shoulder = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.LEFT_SHOULDER)
                            left_elbow = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.LEFT_ELBOW)
                            left_wrist = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.LEFT_WRIST)
                            right_shoulder = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.RIGHT_SHOULDER)
                            right_elbow = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.RIGHT_ELBOW)
                            right_wrist = self._get_landmark_coords(pose_landmarks, self.PoseLandmark.RIGHT_WRIST)

                            # Prefer left arm, fallback to right arm
                            angle = None
                            if left_shoulder and left_elbow and left_wrist:
                                # Calculate angle: shoulder -> elbow -> wrist (as in provided code)
                                angle = self._calculate_angle(
                                    np.array(left_shoulder),
                                    np.array(left_elbow),
                                    np.array(left_wrist)
                                )
                            elif right_shoulder and right_elbow and right_wrist:
                                angle = self._calculate_angle(
                                    np.array(right_shoulder),
                                    np.array(right_elbow),
                                    np.array(right_wrist)
                                )

                            if angle is not None:
                                angles_history["bicep-curl"].append(float(angle))

            cap.release()

            # Count reps for each detected exercise using improved stage-based counting
            total_reps = 0
            total_sets = 0

            for exercise_name in exercises_detected:
                if exercise_name in angles_history and angles_history[exercise_name]:
                    # Use improved stage-based rep counting
                    reps, current_stage = self._count_reps_with_stage(exercise_name, angles_history[exercise_name])

                    detected_exercises.append({
                        "name": exercise_name,
                        "reps": reps,
                        "sets": max(1, reps // 10),  # Estimate sets (10 reps per set)
                        "confidence": 0.8,
                        "duration_seconds": duration / len(exercises_detected) if exercises_detected else duration,
                        "current_stage": current_stage,  # Add stage information
                        "last_angle": angles_history[exercise_name][-1] if angles_history[exercise_name] else None
                    })
                    total_reps += reps
                    total_sets += max(1, reps // 10)

            # If no exercises detected, return default
            if not detected_exercises:
                detected_exercises = [{
                    "name": workout_type or "exercise",
                    "reps": 0,
                    "sets": 0,
                    "confidence": 0.3,
                    "duration_seconds": duration
                }]

            # Estimate calories (rough calculation)
            estimated_calories = self._estimate_calories(detected_exercises, duration)

            processing_time = time.time() - start_time

            result = {
                "detected_exercises": detected_exercises,
                "total_reps": total_reps,
                "total_sets": total_sets,
                "estimated_calories": estimated_calories,
                "form_analysis": {
                    "overall_score": 8.0 if total_reps > 0 else 5.0,
                    "recommendations": self._generate_recommendations(detected_exercises)
                },
                "confidence_score": 0.8 if total_reps > 0 else 0.5,
                "video_duration": duration,
                "processing_time_seconds": processing_time,
                "frames_analyzed": frame_num
            }

            logger.info(f"Workout analysis completed in {processing_time:.2f}s: {total_reps} reps detected")

            return result

        except Exception as e:
            logger.error(f"Error analyzing workout video: {e}", exc_info=True)
            raise

    def _estimate_calories(self, exercises: list[dict], duration: float) -> float:
        """Estimate calories burned based on exercises."""
        # Rough calorie estimates per rep
        calories_per_rep = {
            "push-up": 0.5,
            "squat": 0.3,
            "plank": 0.1,  # per second
            "bicep-curl": 0.25,
            "lunge": 0.35,
            "shoulder-press": 0.4,
            "lateral-raise": 0.2,
            "tricep-dip": 0.35,
            "crunch": 0.15,
            "jumping-jack": 0.2,
            "exercise": 0.2
        }

        total_calories = 0
        for exercise in exercises:
            name = exercise.get("name", "exercise")
            reps = exercise.get("reps", 0)
            duration_sec = exercise.get("duration_seconds", 0)

            if name == "plank":
                total_calories += calories_per_rep.get(name, 0.1) * duration_sec
            else:
                total_calories += calories_per_rep.get(name, 0.2) * reps

        # Add base metabolic rate estimate
        base_calories = duration / 60 * 3  # ~3 calories per minute

        return round(total_calories + base_calories, 1)

    def _generate_recommendations(self, exercises: list[dict]) -> list[str]:
        """Generate form recommendations based on detected exercises."""
        recommendations = []

        for exercise in exercises:
            name = exercise.get("name", "")
            reps = exercise.get("reps", 0)

            if name == "push-up" and reps > 0:
                recommendations.append("Keep your core tight throughout the movement")
                recommendations.append("Maintain a straight line from head to heels")

            elif name == "squat" and reps > 0:
                recommendations.append("Go deeper - aim to get thighs parallel to ground")
                recommendations.append("Keep your knees aligned with your toes")

            elif name == "plank":
                recommendations.append("Engage your core and glutes")
                recommendations.append("Keep your body in a straight line")

            elif name == "bicep-curl" and reps > 0:
                recommendations.append("Keep your elbows close to your torso")
                recommendations.append("Control the weight on the way down")

            elif name == "lunge" and reps > 0:
                recommendations.append("Keep your front knee behind your toes")
                recommendations.append("Lower until both knees are at 90 degrees")

            elif name == "shoulder-press" and reps > 0:
                recommendations.append("Don't arch your back - keep core engaged")
                recommendations.append("Press directly overhead, not in front")

            elif name == "lateral-raise" and reps > 0:
                recommendations.append("Keep a slight bend in your elbows")
                recommendations.append("Raise arms to shoulder height, no higher")

            elif name == "tricep-dip" and reps > 0:
                recommendations.append("Keep your back close to the bench/chair")
                recommendations.append("Lower until elbows are at 90 degrees")

            elif name == "crunch" and reps > 0:
                recommendations.append("Don't pull on your neck - hands behind head lightly")
                recommendations.append("Focus on contracting your abs, not hip flexors")

            elif name == "jumping-jack" and reps > 0:
                recommendations.append("Land softly on the balls of your feet")
                recommendations.append("Keep your arms straight throughout")

        if not recommendations:
            recommendations.append("Focus on proper form over speed")
            recommendations.append("Maintain controlled movements")

        return recommendations[:3]  # Return top 3 recommendations

# Global service instance
_workout_recognition_service: WorkoutRecognitionService | None = None

def get_workout_recognition_service() -> WorkoutRecognitionService:
    """Get or create the workout recognition service instance."""
    global _workout_recognition_service
    if _workout_recognition_service is None:
        _workout_recognition_service = WorkoutRecognitionService()
    return _workout_recognition_service
