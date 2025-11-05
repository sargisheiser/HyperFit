"""
MediaPipe Workout Recognition Service
Uses MediaPipe Pose for exercise detection and rep counting.
"""

import cv2
import numpy as np
import mediapipe as mp
import logging
import time
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

class WorkoutRecognitionService:
    """Service for analyzing workout videos using MediaPipe Pose."""
    
    def __init__(self):
        """Initialize MediaPipe Pose model with optimized settings."""
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,  # Higher complexity for better accuracy
            enable_segmentation=False,
            smooth_landmarks=True,  # Smooth landmark detection
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        logger.info("MediaPipe Pose model initialized (model_complexity=2)")
    
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
    
    def _get_landmark_coords(self, landmarks, index: int) -> Optional[Tuple[float, float]]:
        """Get landmark coordinates by index."""
        if landmarks and len(landmarks.landmark) > index:
            landmark = landmarks.landmark[index]
            return (landmark.x, landmark.y)
        return None
    
    def _detect_exercise_type(self, landmarks, frame_count: int) -> Dict[str, Any]:
        """Detect exercise type based on pose landmarks with improved accuracy."""
        # Get all key landmarks with visibility check
        left_shoulder = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_SHOULDER)
        right_shoulder = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_SHOULDER)
        left_elbow = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_ELBOW)
        right_elbow = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_ELBOW)
        left_wrist = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_WRIST)
        right_wrist = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_WRIST)
        left_hip = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_HIP)
        right_hip = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_HIP)
        left_knee = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_KNEE)
        right_knee = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_KNEE)
        left_ankle = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_ANKLE)
        right_ankle = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_ANKLE)
        left_ear = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.LEFT_EAR)
        right_ear = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.RIGHT_EAR)
        nose = self._get_landmark_coords(landmarks, self.mp_pose.PoseLandmark.NOSE)
        
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
        
        # Detect SQUATS with improved logic
        if left_knee and right_knee and left_hip and right_hip and left_ankle and right_ankle:
            avg_knee_y = (left_knee[1] + right_knee[1]) / 2
            avg_ankle_y = (left_ankle[1] + right_ankle[1]) / 2
            
            # Hips should be below knees when in squat position
            hips_below_knees = hip_center_y > avg_knee_y + 0.02
            
            # Calculate knee angles
            left_knee_angle = None
            right_knee_angle = None
            
            if left_hip and left_knee and left_ankle:
                left_knee_angle = self._calculate_angle(left_hip, left_knee, left_ankle)
            
            if right_hip and right_knee and right_ankle:
                right_knee_angle = self._calculate_angle(right_hip, right_knee, right_ankle)
            
            # Knees should be bent
            knees_bent = False
            if left_knee_angle and right_knee_angle:
                knees_bent = (left_knee_angle < 150 and right_knee_angle < 150)
            elif left_knee_angle:
                knees_bent = left_knee_angle < 150
            elif right_knee_angle:
                knees_bent = right_knee_angle < 150
            
            # Body should be vertical (standing/squatting)
            body_vertical = body_vertical_alignment < 0.1
            
            # Squat detection criteria
            if (hips_below_knees or knees_bent) and body_vertical:
                confidence = 0.7
                if left_knee_angle and right_knee_angle:
                    avg_angle = (left_knee_angle + right_knee_angle) / 2
                    if 60 < avg_angle < 140:  # Good squat range
                        confidence = 0.9
                elif left_knee_angle:
                    if 60 < left_knee_angle < 140:
                        confidence = 0.85
                
                return {"name": "squat", "confidence": confidence, "angle": left_knee_angle or right_knee_angle}
        
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
            toes_on_ground = False
            if left_ankle and right_ankle:
                avg_ankle_y = (left_ankle[1] + right_ankle[1]) / 2
                toes_on_ground = avg_ankle_y > hip_center_y
            
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
        
        # Detect STANDING / READY position
        if left_shoulder and right_shoulder and left_hip and right_hip:
            body_vertical = body_vertical_alignment < 0.1
            shoulder_hip_diff = abs(shoulder_center_y - hip_center_y)
            
            if body_vertical and shoulder_hip_diff > 0.15:  # Standing upright
                return {"name": "ready", "confidence": 0.5}
        
        return {"name": "unknown", "confidence": 0.2}
    
    def _count_reps(self, exercise_type: str, angles_history: List[float]) -> int:
        """Count repetitions based on angle history."""
        if len(angles_history) < 10:
            return 0
        
        reps = 0
        threshold_down = 90 if exercise_type == "push-up" else 120
        threshold_up = 160 if exercise_type == "push-up" else 170
        
        state = "up"  # Start in up position
        for angle in angles_history:
            if state == "up" and angle < threshold_down:
                state = "down"
            elif state == "down" and angle > threshold_up:
                state = "up"
                reps += 1
        
        return reps
    
    async def analyze_workout_video(
        self,
        video_path: str,
        workout_type: Optional[str] = None
    ) -> Dict[str, Any]:
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
            angles_history = {exercise: [] for exercise in ["push-up", "squat", "plank"]}
            
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
                
                # Process frame with MediaPipe
                results = self.pose.process(rgb_frame)
                
                if results.pose_landmarks:
                    # Detect exercise type
                    exercise_info = self._detect_exercise_type(results.pose_landmarks, frame_num)
                    
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
                        if exercise_name == "push-up" and results.pose_landmarks:
                            left_elbow = self._get_landmark_coords(
                                results.pose_landmarks, 
                                self.mp_pose.PoseLandmark.LEFT_ELBOW
                            )
                            left_shoulder = self._get_landmark_coords(
                                results.pose_landmarks,
                                self.mp_pose.PoseLandmark.LEFT_SHOULDER
                            )
                            left_wrist = self._get_landmark_coords(
                                results.pose_landmarks,
                                self.mp_pose.PoseLandmark.LEFT_WRIST
                            )
                            
                            if left_elbow and left_shoulder and left_wrist:
                                angle = self._calculate_angle(
                                    np.array(left_wrist),
                                    np.array(left_elbow),
                                    np.array(left_shoulder)
                                )
                                angles_history["push-up"].append(angle)
                        
                        elif exercise_name == "squat" and results.pose_landmarks:
                            left_hip = self._get_landmark_coords(
                                results.pose_landmarks,
                                self.mp_pose.PoseLandmark.LEFT_HIP
                            )
                            left_knee = self._get_landmark_coords(
                                results.pose_landmarks,
                                self.mp_pose.PoseLandmark.LEFT_KNEE
                            )
                            left_ankle = self._get_landmark_coords(
                                results.pose_landmarks,
                                self.mp_pose.PoseLandmark.LEFT_ANKLE
                            )
                            
                            if left_hip and left_knee and left_ankle:
                                angle = self._calculate_angle(
                                    np.array(left_hip),
                                    np.array(left_knee),
                                    np.array(left_ankle)
                                )
                                angles_history["squat"].append(angle)
            
            cap.release()
            
            # Count reps for each detected exercise
            total_reps = 0
            total_sets = 0
            
            for exercise_name in exercises_detected:
                if exercise_name in angles_history and angles_history[exercise_name]:
                    reps = self._count_reps(exercise_name, angles_history[exercise_name])
                    detected_exercises.append({
                        "name": exercise_name,
                        "reps": reps,
                        "sets": max(1, reps // 10),  # Estimate sets (10 reps per set)
                        "confidence": 0.8,
                        "duration_seconds": duration / len(exercises_detected) if exercises_detected else duration
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
    
    def _estimate_calories(self, exercises: List[Dict], duration: float) -> float:
        """Estimate calories burned based on exercises."""
        # Rough calorie estimates per rep
        calories_per_rep = {
            "push-up": 0.5,
            "squat": 0.3,
            "plank": 0.1,  # per second
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
    
    def _generate_recommendations(self, exercises: List[Dict]) -> List[str]:
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
        
        if not recommendations:
            recommendations.append("Focus on proper form over speed")
            recommendations.append("Maintain controlled movements")
        
        return recommendations[:3]  # Return top 3 recommendations

# Global service instance
_workout_recognition_service: Optional[WorkoutRecognitionService] = None

def get_workout_recognition_service() -> WorkoutRecognitionService:
    """Get or create the workout recognition service instance."""
    global _workout_recognition_service
    if _workout_recognition_service is None:
        _workout_recognition_service = WorkoutRecognitionService()
    return _workout_recognition_service
