// Workout Categories - Body Parts with Equipment and Exercise Types
export const workoutCategories = {
  chest: {
    name: 'Chest',
    icon: '💪',
    equipment: [
      { value: 'machine', label: 'Machine (Chest Press, Peck Deck)' },
      { value: 'barbell', label: 'Barbell (Bench Press, Incline)' },
      { value: 'dumbbell', label: 'Dumbbell (Flyes, Press)' },
      { value: 'bodyweight', label: 'Bodyweight (Push-ups, Dips)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Chest Fly)' },
      { value: 'cables', label: 'Cables (Cable Fly, Crossover)' }
    ],
    exercises: {
      machine: ['Chest Press Machine', 'Peck Deck', 'Cable Chest Press'],
      barbell: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Close Grip Bench Press'],
      dumbbell: ['Dumbbell Press', 'Dumbbell Flyes', 'Incline Dumbbell Press', 'Decline Dumbbell Press'],
      bodyweight: ['Push-ups', 'Wide Push-ups', 'Diamond Push-ups', 'Incline Push-ups', 'Dips'],
      resistance_bands: ['Band Chest Press', 'Band Chest Fly', 'Band Pull-apart'],
      cables: ['Cable Fly', 'Cable Crossover', 'Cable Chest Press']
    }
  },
  back: {
    name: 'Back',
    icon: '🔙',
    equipment: [
      { value: 'machine', label: 'Machine (Lat Pulldown, Row Machine)' },
      { value: 'barbell', label: 'Barbell (Rows, Deadlift)' },
      { value: 'dumbbell', label: 'Dumbbell (Rows, Pullovers)' },
      { value: 'bodyweight', label: 'Bodyweight (Pull-ups, Rows)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Rows, Pulls)' },
      { value: 'cables', label: 'Cables (Cable Rows, Pulldowns)' }
    ],
    exercises: {
      machine: ['Lat Pulldown', 'Seated Row Machine', 'Cable Row', 'T-Bar Row'],
      barbell: ['Barbell Row', 'Deadlift', 'Bent Over Row', 'T-Bar Row'],
      dumbbell: ['Dumbbell Row', 'Dumbbell Pullover', 'One-Arm Row', 'Renegade Row'],
      bodyweight: ['Pull-ups', 'Chin-ups', 'Inverted Rows', 'Wide Grip Pull-ups'],
      resistance_bands: ['Band Row', 'Band Pull-apart', 'Band Lat Pulldown'],
      cables: ['Cable Row', 'Cable Pulldown', 'Cable Pullover', 'Face Pull']
    }
  },
  shoulders: {
    name: 'Shoulders',
    icon: '🏋️',
    equipment: [
      { value: 'machine', label: 'Machine (Shoulder Press)' },
      { value: 'barbell', label: 'Barbell (Overhead Press)' },
      { value: 'dumbbell', label: 'Dumbbell (Press, Raises)' },
      { value: 'bodyweight', label: 'Bodyweight (Pike Push-ups)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Press, Raises)' },
      { value: 'cables', label: 'Cables (Lateral Raises)' }
    ],
    exercises: {
      machine: ['Shoulder Press Machine', 'Lateral Raise Machine'],
      barbell: ['Overhead Press', 'Behind Neck Press', 'Front Raise'],
      dumbbell: ['Dumbbell Press', 'Lateral Raises', 'Front Raises', 'Rear Delt Flyes'],
      bodyweight: ['Pike Push-ups', 'Handstand Push-ups', 'Wall Walk'],
      resistance_bands: ['Band Press', 'Band Lateral Raise', 'Band Front Raise'],
      cables: ['Cable Lateral Raise', 'Cable Front Raise', 'Cable Rear Delt']
    }
  },
  legs: {
    name: 'Legs',
    icon: '🦵',
    equipment: [
      { value: 'machine', label: 'Machine (Leg Press, Extension)' },
      { value: 'barbell', label: 'Barbell (Squats, Deadlifts)' },
      { value: 'dumbbell', label: 'Dumbbell (Lunges, Step-ups)' },
      { value: 'bodyweight', label: 'Bodyweight (Squats, Lunges)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Squats, Leg Curls)' },
      { value: 'cables', label: 'Cables (Leg Extensions)' }
    ],
    exercises: {
      machine: ['Leg Press', 'Leg Extension', 'Leg Curl', 'Hack Squat'],
      barbell: ['Back Squat', 'Front Squat', 'Romanian Deadlift', 'Leg Press'],
      dumbbell: ['Dumbbell Squat', 'Lunges', 'Step-ups', 'Bulgarian Split Squat'],
      bodyweight: ['Squats', 'Lunges', 'Jump Squats', 'Pistol Squats', 'Wall Sits'],
      resistance_bands: ['Band Squat', 'Band Leg Curl', 'Band Leg Extension'],
      cables: ['Cable Leg Extension', 'Cable Leg Curl', 'Cable Kickback']
    }
  },
  arms: {
    name: 'Arms',
    icon: '💪',
    equipment: [
      { value: 'machine', label: 'Machine (Curl, Extension)' },
      { value: 'barbell', label: 'Barbell (Curls)' },
      { value: 'dumbbell', label: 'Dumbbell (Curls, Extensions)' },
      { value: 'bodyweight', label: 'Bodyweight (Dips, Chin-ups)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Curls)' },
      { value: 'cables', label: 'Cables (Curls, Extensions)' }
    ],
    exercises: {
      machine: ['Bicep Curl Machine', 'Tricep Extension Machine'],
      barbell: ['Barbell Curl', 'EZ Bar Curl', 'Close Grip Bench Press'],
      dumbbell: ['Dumbbell Curl', 'Hammer Curl', 'Tricep Extension', 'Overhead Extension'],
      bodyweight: ['Dips', 'Chin-ups', 'Diamond Push-ups', 'Close Grip Push-ups'],
      resistance_bands: ['Band Curl', 'Band Tricep Extension'],
      cables: ['Cable Curl', 'Cable Tricep Extension', 'Cable Hammer Curl']
    }
  },
  core: {
    name: 'Core',
    icon: '🔥',
    equipment: [
      { value: 'machine', label: 'Machine (Ab Crunch)' },
      { value: 'bodyweight', label: 'Bodyweight (Planks, Crunches)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Woodchoppers)' },
      { value: 'cables', label: 'Cables (Cable Crunches)' },
      { value: 'medicine_ball', label: 'Medicine Ball' }
    ],
    exercises: {
      machine: ['Ab Crunch Machine', 'Roman Chair'],
      bodyweight: ['Plank', 'Side Plank', 'Crunches', 'Sit-ups', 'Leg Raises', 'Russian Twists'],
      resistance_bands: ['Band Crunch', 'Band Woodchopper'],
      cables: ['Cable Crunch', 'Cable Woodchopper'],
      medicine_ball: ['Medicine Ball Crunch', 'Medicine Ball Twist']
    }
  },
  cardio: {
    name: 'Cardio',
    icon: '🏃',
    equipment: [
      { value: 'treadmill', label: 'Treadmill' },
      { value: 'bike', label: 'Bike (Stationary)' },
      { value: 'elliptical', label: 'Elliptical' },
      { value: 'rowing', label: 'Rowing Machine' },
      { value: 'outdoor', label: 'Outdoor (Running, Cycling)' },
      { value: 'bodyweight', label: 'Bodyweight (Jumping, Burpees)' }
    ],
    exercises: {
      treadmill: ['Running', 'Walking', 'Sprint Intervals', 'Incline Walking'],
      bike: ['Stationary Bike', 'Spin Bike', 'Recumbent Bike'],
      elliptical: ['Elliptical Training', 'Cross Trainer'],
      rowing: ['Rowing Machine', 'Ergometer'],
      outdoor: ['Running', 'Cycling', 'Swimming', 'Hiking'],
      bodyweight: ['Burpees', 'Jumping Jacks', 'Mountain Climbers', 'High Knees']
    }
  },
  glutes: {
    name: 'Glutes',
    icon: '🍑',
    equipment: [
      { value: 'machine', label: 'Machine (Hip Thrust, Glute Kickback)' },
      { value: 'barbell', label: 'Barbell (Hip Thrust, Squats)' },
      { value: 'dumbbell', label: 'Dumbbell (Lunges, Step-ups)' },
      { value: 'bodyweight', label: 'Bodyweight (Glute Bridge, Lunges)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Hip Thrust, Kickbacks)' },
      { value: 'cables', label: 'Cables (Cable Kickback)' }
    ],
    exercises: {
      machine: ['Hip Thrust Machine', 'Glute Kickback Machine', 'Leg Press'],
      barbell: ['Barbell Hip Thrust', 'Barbell Glute Bridge', 'Sumo Deadlift'],
      dumbbell: ['Dumbbell Hip Thrust', 'Bulgarian Split Squat', 'Step-ups', 'Walking Lunges'],
      bodyweight: ['Glute Bridge', 'Single Leg Glute Bridge', 'Lunges', 'Reverse Lunges', 'Fire Hydrants'],
      resistance_bands: ['Band Hip Thrust', 'Band Kickback', 'Band Glute Bridge', 'Band Walk'],
      cables: ['Cable Kickback', 'Cable Hip Abduction', 'Cable Glute Bridge']
    }
  },
  calves: {
    name: 'Calves',
    icon: '🦶',
    equipment: [
      { value: 'machine', label: 'Machine (Calf Raise Machine)' },
      { value: 'barbell', label: 'Barbell (Calf Raises)' },
      { value: 'dumbbell', label: 'Dumbbell (Calf Raises)' },
      { value: 'bodyweight', label: 'Bodyweight (Calf Raises, Jumping)' },
      { value: 'smith_machine', label: 'Smith Machine (Calf Raises)' }
    ],
    exercises: {
      machine: ['Calf Raise Machine', 'Seated Calf Raise', 'Standing Calf Raise'],
      barbell: ['Barbell Calf Raise', 'Seated Barbell Calf Raise'],
      dumbbell: ['Dumbbell Calf Raise', 'Seated Dumbbell Calf Raise', 'Single Leg Calf Raise'],
      bodyweight: ['Calf Raises', 'Single Leg Calf Raises', 'Jump Rope', 'Box Jumps'],
      smith_machine: ['Smith Machine Calf Raise', 'Seated Smith Machine Calf Raise']
    }
  },
  full_body: {
    name: 'Full Body',
    icon: '🌐',
    equipment: [
      { value: 'barbell', label: 'Barbell (Complex Movements)' },
      { value: 'dumbbell', label: 'Dumbbell (Full Body Circuits)' },
      { value: 'kettlebell', label: 'Kettlebell (Swings, Snatches)' },
      { value: 'bodyweight', label: 'Bodyweight (Burpees, Complexes)' },
      { value: 'resistance_bands', label: 'Resistance Bands (Full Body)' },
      { value: 'cables', label: 'Cables (Functional Training)' }
    ],
    exercises: {
      barbell: ['Clean and Press', 'Thruster', 'Deadlift to Row', 'Squat to Press'],
      dumbbell: ['Dumbbell Complex', 'Man Makers', 'Renegade Row', 'Swinging Lunges'],
      kettlebell: ['Kettlebell Swing', 'Kettlebell Snatch', 'Turkish Get-up', 'Clean and Press'],
      bodyweight: ['Burpees', 'Mountain Climbers', 'Bear Crawl', 'Crab Walk', 'Full Body Circuit'],
      resistance_bands: ['Band Full Body Circuit', 'Band Squat to Press', 'Band Pull and Press'],
      cables: ['Cable Woodchopper', 'Cable Full Body Circuit', 'Functional Cable Training']
    }
  },
  flexibility: {
    name: 'Flexibility',
    icon: '🧘',
    equipment: [
      { value: 'yoga_mat', label: 'Yoga Mat' },
      { value: 'foam_roller', label: 'Foam Roller' },
      { value: 'resistance_bands', label: 'Resistance Bands (Stretching)' },
      { value: 'bodyweight', label: 'Bodyweight (Stretching)' }
    ],
    exercises: {
      yoga_mat: ['Yoga Flow', 'Pilates', 'Static Stretching', 'Dynamic Stretching', 'Mobility Work'],
      foam_roller: ['Foam Rolling', 'Self-Myofascial Release', 'Trigger Point Release'],
      resistance_bands: ['Band Stretching', 'Band Mobility Work', 'Band Assisted Stretches'],
      bodyweight: ['Static Stretches', 'Dynamic Warm-up', 'Mobility Exercises', 'PNF Stretching']
    }
  }
}

export const bodyParts = Object.keys(workoutCategories).map(key => ({
  value: key,
  label: workoutCategories[key].name,
  icon: workoutCategories[key].icon
}))

export function getEquipmentForBodyPart(bodyPart) {
  return workoutCategories[bodyPart]?.equipment || []
}

export function getExercisesForEquipment(bodyPart, equipment) {
  return workoutCategories[bodyPart]?.exercises[equipment] || []
}

