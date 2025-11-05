"""
WebSocket endpoints for real-time workout analysis
"""

import asyncio
import base64
import cv2
import numpy as np
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Optional
import json
import time

from ai_modules.workout_tracking.mediapipe_service import get_workout_recognition_service

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.frame_processors: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        """Connect a new WebSocket client."""
        await websocket.accept()
        connection_id = f"user_{user_id}_{int(time.time())}"
        self.active_connections[connection_id] = websocket
        self.frame_processors[connection_id] = {
            "user_id": user_id,
            "exercise_history": {},
            "rep_counts": {},
            "last_exercise": None,
            "start_time": time.time()
        }
        logger.info(f"WebSocket connected: {connection_id}")
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Disconnect a WebSocket client."""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        if connection_id in self.frame_processors:
            del self.frame_processors[connection_id]
        logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_personal_message(self, message: dict, connection_id: str):
        """Send message to a specific connection."""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")

manager = ConnectionManager()

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image string to numpy array."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    except Exception as e:
        logger.error(f"Error decoding image: {e}")
        return None

async def process_frame(
    frame_data: np.ndarray,
    connection_id: str,
    workout_service
) -> dict:
    """Process a single frame and return analysis results."""
    try:
        processor = manager.frame_processors[connection_id]
        
        # Process frame with MediaPipe
        results = workout_service.pose.process(frame_data)
        
        if not results.pose_landmarks:
            # Check if we have a previous exercise to maintain rep count
            last_exercise = processor.get("last_exercise")
            last_rep_count = processor["rep_counts"].get(last_exercise, 0) if last_exercise else 0
            return {
                "detected": False,
                "rep_count": last_rep_count,
                "exercise": last_exercise,
                "form_score": None,
                "message": "No pose detected - ensure full body is visible"
            }
        
        # Check landmark visibility
        visible_landmarks = sum(1 for lm in results.pose_landmarks.landmark if lm.visibility > 0.5)
        if visible_landmarks < 10:
            logger.warning(f"Low landmark visibility: {visible_landmarks}/33 landmarks visible")
        
        # Detect exercise type
        exercise_info = workout_service._detect_exercise_type(results.pose_landmarks, 0)
        
        # Even if unknown, try to keep last exercise if confidence is low
        if exercise_info["name"] == "unknown" and exercise_info["confidence"] < 0.3:
            # Keep last exercise if we had one recently
            last_exercise = processor.get("last_exercise")
            if last_exercise:
                # Return last exercise with lower confidence
                return {
                    "detected": False,
                    "rep_count": processor["rep_counts"].get(last_exercise, 0),
                    "exercise": last_exercise,
                    "form_score": None,
                    "message": "Exercise detection unclear - maintain position"
                }
        
        if exercise_info["name"] == "unknown":
            return {
                "detected": False,
                "rep_count": processor["rep_counts"].get(processor["last_exercise"], 0) if processor["last_exercise"] else 0,
                "exercise": processor["last_exercise"],
                "form_score": None,
                "message": "No exercise detected"
            }
        
        exercise_name = exercise_info["name"]
        processor["last_exercise"] = exercise_name
        
        # Initialize exercise tracking if needed
        if exercise_name not in processor["exercise_history"]:
            processor["exercise_history"][exercise_name] = {
                "angles": [],
                "state": "up",
                "rep_count": 0,
                "last_angle": None
            }
        
        exercise_data = processor["exercise_history"][exercise_name]
        
        # Calculate angle for rep counting
        angle = None
        mp_pose = workout_service.mp_pose
        
        if exercise_name == "push-up":
            left_elbow = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_ELBOW
            )
            left_shoulder = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_SHOULDER
            )
            left_wrist = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_WRIST
            )
            
            if left_elbow and left_shoulder and left_wrist:
                angle = workout_service._calculate_angle(
                    np.array(left_wrist),
                    np.array(left_elbow),
                    np.array(left_shoulder)
                )
        
        elif exercise_name == "squat":
            left_hip = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_HIP
            )
            left_knee = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_KNEE
            )
            left_ankle = workout_service._get_landmark_coords(
                results.pose_landmarks,
                mp_pose.PoseLandmark.LEFT_ANKLE
            )
            
            if left_hip and left_knee and left_ankle:
                angle = workout_service._calculate_angle(
                    np.array(left_hip),
                    np.array(left_knee),
                    np.array(left_ankle)
                )
        
        # Count reps based on angle changes with improved thresholds
        if angle is not None:
            exercise_data["angles"].append(angle)
            if len(exercise_data["angles"]) > 15:  # Keep more history for better detection
                exercise_data["angles"].pop(0)
            
            # Improved thresholds based on exercise type
            if exercise_name == "push-up":
                threshold_down = 100  # More lenient for push-ups
                threshold_up = 150
            elif exercise_name == "squat":
                threshold_down = 100  # More lenient for squats
                threshold_up = 160
            else:
                threshold_down = 90
                threshold_up = 170
            
            # Smooth state transitions with hysteresis
            if exercise_data["state"] == "up":
                # Need to go down significantly before changing state
                if angle < threshold_down:
                    exercise_data["state"] = "down"
                    exercise_data["down_angle"] = angle
            elif exercise_data["state"] == "down":
                # Need to come back up significantly
                if angle > threshold_up:
                    exercise_data["state"] = "up"
                    exercise_data["rep_count"] += 1
                    processor["rep_counts"][exercise_name] = exercise_data["rep_count"]
                    logger.info(f"Rep counted! {exercise_name}: {exercise_data['rep_count']} reps")
        
        # Calculate form score (simplified)
        form_score = 8.0 if angle and 90 < angle < 170 else 7.0
        
        return {
            "detected": True,
            "exercise": exercise_name,
            "rep_count": exercise_data["rep_count"],
            "form_score": form_score,
            "angle": angle,
            "confidence": exercise_info["confidence"]
        }
    
    except Exception as e:
        logger.error(f"Error processing frame: {e}", exc_info=True)
        return {
            "detected": False,
            "error": str(e)
        }

@router.websocket("/ws/workout-live")
async def workout_live_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time workout analysis.
    
    Receives base64-encoded frames and returns exercise detection and rep counts.
    """
    connection_id = None
    workout_service = get_workout_recognition_service()
    
    try:
        # Accept connection (no auth required for now, but could add)
        connection_id = await manager.connect(websocket)
        
        # Send initial connection message
        await manager.send_personal_message({
            "type": "connected",
            "message": "Connected to live workout analyzer",
            "timestamp": time.time()
        }, connection_id)
        
        frame_count = 0
        last_processed_time = time.time()
        process_interval = 0.1  # Process every 100ms (10 FPS)
        
        while True:
            # Receive frame data
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, connection_id)
                continue
            
            message_type = message.get("type", "frame")
            
            if message_type == "frame":
                # Process frame
                current_time = time.time()
                if current_time - last_processed_time < process_interval:
                    continue  # Skip frames too close together
                
                last_processed_time = current_time
                frame_count += 1
                
                frame_base64 = message.get("frame")
                if not frame_base64:
                    continue
                
                # Decode image
                frame = decode_base64_image(frame_base64)
                if frame is None:
                    continue
                
                # Process frame
                result = await process_frame(frame, connection_id, workout_service)
                
                # Send results
                await manager.send_personal_message({
                    "type": "analysis",
                    "frame_count": frame_count,
                    "result": result,
                    "timestamp": time.time()
                }, connection_id)
            
            elif message_type == "reset":
                # Reset counters
                processor = manager.frame_processors[connection_id]
                processor["exercise_history"] = {}
                processor["rep_counts"] = {}
                processor["last_exercise"] = None
                
                await manager.send_personal_message({
                    "type": "reset_complete",
                    "message": "Counters reset"
                }, connection_id)
            
            elif message_type == "ping":
                # Heartbeat
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": time.time()
                }, connection_id)
        
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {connection_id}")
        if connection_id:
            manager.disconnect(connection_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        if connection_id:
            manager.disconnect(connection_id)
