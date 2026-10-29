// Renames library exercises to the names people use in the gym, adds search aliases,
// and adds popular exercises the library doesn't have (mostly machines). Run: node native/exercise-names.mjs
import fs from 'node:fs';
const FILE = new URL('../exercises.js', import.meta.url);
const src = fs.readFileSync(FILE, 'utf8');
const w = {}; new Function('window', src)(w);
let L = w.GG_EXERCISES.filter(x => !x.id.startsWith('gg_'));

// id → [everyday name, ...extra search words]
const NAMES = {
  'Barbell_Bench_Press_-_Medium_Grip': ['Bench Press', 'flat bench', 'barbell bench'],
  'Barbell_Incline_Bench_Press_-_Medium_Grip': ['Incline Bench Press', 'incline barbell'],
  'Decline_Barbell_Bench_Press': ['Decline Bench Press', 'lower chest'],
  'Dumbbell_Bench_Press': ['Dumbbell Bench Press', 'db bench', 'dumbbell press'],
  'Incline_Dumbbell_Press': ['Incline Dumbbell Press', 'incline db press', 'upper chest'],
  'Dumbbell_Flyes': ['Dumbbell Fly', 'chest fly', 'flyes'],
  'Pushups': ['Push-ups', 'press ups', 'pushups'],
  'Dips_-_Chest_Version': ['Chest Dips', 'dips'],
  'Butterfly': ['Pec Deck', 'chest fly machine', 'butterfly', 'pec fly'],
  'Cable_Crossover': ['Cable Fly', 'cable crossover', 'cable chest fly'],
  'Close-Grip_Barbell_Bench_Press': ['Close-Grip Bench Press', 'cgbp'],
  'Smith_Machine_Bench_Press': ['Smith Machine Bench Press', 'smith bench'],
  'Leverage_Chest_Press': ['Chest Press Machine', 'machine chest press', 'seated chest press'],
  'Leverage_Incline_Chest_Press': ['Incline Chest Press Machine', 'machine incline press'],
  'Barbell_Squat': ['Squat', 'back squat', 'barbell squat'],
  'Barbell_Full_Squat': ['Deep Squat', 'full squat', 'ass to grass'],
  'Front_Squat_Clean_Grip': ['Front Squat'],
  'Leg_Press': ['Leg Press'],
  'Romanian_Deadlift': ['Romanian Deadlift (RDL)', 'rdl', 'stiff leg'],
  'Barbell_Deadlift': ['Deadlift', 'conventional deadlift'],
  'Sumo_Deadlift': ['Sumo Deadlift'],
  'Trap_Bar_Deadlift': ['Trap Bar Deadlift', 'hex bar deadlift'],
  'Barbell_Hip_Thrust': ['Hip Thrust', 'glute thrust', 'barbell hip thrust'],
  'Barbell_Glute_Bridge': ['Glute Bridge'],
  'Dumbbell_Lunges': ['Dumbbell Lunges', 'lunges'],
  'Barbell_Walking_Lunge': ['Walking Lunges'],
  'Split_Squat_with_Dumbbells': ['Bulgarian Split Squat', 'split squat', 'bss', 'rear foot elevated'],
  'Dumbbell_Step_Ups': ['Step-ups', 'step ups', 'box step'],
  'Leg_Extensions': ['Leg Extension', 'quad extension'],
  'Lying_Leg_Curls': ['Lying Leg Curl', 'hamstring curl'],
  'Seated_Leg_Curl': ['Seated Leg Curl', 'hamstring curl'],
  'Standing_Calf_Raises': ['Standing Calf Raise', 'calves'],
  'Seated_Calf_Raise': ['Seated Calf Raise', 'calves'],
  'Calf_Press_On_The_Leg_Press_Machine': ['Calf Press (Leg Press)', 'calves'],
  'Barbell_Hack_Squat': ['Barbell Hack Squat'],
  'Goblet_Squat': ['Goblet Squat'],
  'Thigh_Abductor': ['Hip Abduction Machine', 'outer thigh machine', 'abductor'],
  'Thigh_Adductor': ['Hip Adduction Machine', 'inner thigh machine', 'adductor'],
  'Glute_Kickback': ['Glute Kickback'],
  'One-Legged_Cable_Kickback': ['Cable Glute Kickback', 'kickback'],
  'Good_Morning': ['Good Morning'],
  'Pullups': ['Pull-ups', 'pullups', 'chin ups'],
  'Chin-Up': ['Chin-ups', 'chinups'],
  'Band_Assisted_Pull-Up': ['Assisted Pull-ups (Band)', 'assisted pullup'],
  'Wide-Grip_Lat_Pulldown': ['Lat Pulldown', 'pulldown', 'lat pull down'],
  'Close-Grip_Front_Lat_Pulldown': ['Close-Grip Lat Pulldown', 'pulldown'],
  'Bent_Over_Barbell_Row': ['Barbell Row', 'bent over row'],
  'One-Arm_Dumbbell_Row': ['Single-Arm Dumbbell Row', 'one arm row', 'db row'],
  'Seated_Cable_Rows': ['Seated Cable Row', 'cable row', 'low row'],
  'T-Bar_Row_with_Handle': ['T-Bar Row'],
  'Face_Pull': ['Face Pull', 'rear delts'],
  'Barbell_Shrug': ['Barbell Shrugs', 'traps'],
  'Dumbbell_Shrug': ['Dumbbell Shrugs', 'traps'],
  'Hyperextensions_Back_Extensions': ['Back Extension', 'hyperextension', 'lower back'],
  'Straight-Arm_Dumbbell_Pullover': ['Dumbbell Pullover'],
  'Standing_Military_Press': ['Overhead Press (OHP)', 'ohp', 'military press', 'shoulder press'],
  'Seated_Barbell_Military_Press': ['Seated Barbell Shoulder Press', 'military press'],
  'Dumbbell_Shoulder_Press': ['Dumbbell Shoulder Press', 'db shoulder press'],
  'Side_Lateral_Raise': ['Lateral Raise', 'side raise', 'lat raise', 'side delts'],
  'Arnold_Dumbbell_Press': ['Arnold Press'],
  'Reverse_Flyes': ['Rear Delt Fly', 'reverse fly', 'rear delts'],
  'Front_Dumbbell_Raise': ['Front Raise'],
  'Machine_Shoulder_Military_Press': ['Shoulder Press Machine', 'machine shoulder press'],
  'Standing_Dumbbell_Upright_Row': ['Dumbbell Upright Row', 'upright row'],
  'Smith_Machine_Upright_Row': ['Smith Machine Upright Row', 'upright row'],
  'Barbell_Curl': ['Barbell Curl', 'bicep curl'],
  'Dumbbell_Bicep_Curl': ['Dumbbell Curl', 'bicep curl', 'db curl'],
  'Hammer_Curls': ['Hammer Curl'],
  'Preacher_Curl': ['Preacher Curl'],
  'EZ-Bar_Curl': ['EZ-Bar Curl'],
  'Incline_Dumbbell_Curl': ['Incline Dumbbell Curl'],
  'Concentration_Curls': ['Concentration Curl'],
  'Standing_Biceps_Cable_Curl': ['Cable Curl', 'bicep cable curl'],
  'Triceps_Pushdown': ['Tricep Pushdown', 'cable pushdown', 'triceps pushdown'],
  'Triceps_Pushdown_-_Rope_Attachment': ['Rope Pushdown', 'tricep rope'],
  'Dips_-_Triceps_Version': ['Tricep Dips', 'dips'],
  'Lying_Triceps_Press': ['Skull Crushers', 'lying tricep extension', 'skullcrusher'],
  'Cable_Rope_Overhead_Triceps_Extension': ['Overhead Rope Extension', 'overhead tricep'],
  'Tricep_Dumbbell_Kickback': ['Tricep Kickback'],
  'Dip_Machine': ['Dip Machine', 'seated dip'],
  'Plank': ['Plank'],
  'Crunches': ['Crunches', 'abs'],
  'Cable_Crunch': ['Cable Crunch', 'abs'],
  'Hanging_Leg_Raise': ['Hanging Leg Raise', 'abs'],
  'Russian_Twist': ['Russian Twist', 'obliques'],
  'Ab_Roller': ['Ab Wheel Rollout', 'ab roller', 'ab wheel'],
  'Sit-Up': ['Sit-ups'],
  'Ab_Crunch_Machine': ['Ab Crunch Machine', 'abs machine'],
  'Dead_Bug': ['Dead Bug'],
  'Mountain_Climbers': ['Mountain Climbers'],
  "Farmers_Walk": ["Farmer's Walk", 'farmers carry'],
  'One-Arm_Kettlebell_Swings': ['Kettlebell Swing (One Arm)', 'kb swing'],
  'Sled_Push': ['Sled Push', 'prowler'],
  'Pallof_Press': ['Pallof Press', 'anti rotation'],
  'Standing_Cable_Wood_Chop': ['Cable Woodchop', 'wood chop'],
  'Running_Treadmill': ['Treadmill Run', 'running', 'treadmill'],
  'Walking_Treadmill': ['Treadmill Walk', 'incline walk', 'treadmill'],
  'Bicycling_Stationary': ['Exercise Bike', 'spin bike', 'stationary bike', 'cycling'],
  'Rowing_Stationary': ['Rowing Machine', 'rower', 'erg'],
  'Elliptical_Trainer': ['Cross Trainer', 'elliptical'],
  'Stairmaster': ['Stair Climber', 'stairmaster', 'stairs'],
  'Recumbent_Bike': ['Recumbent Bike'],
  'Rope_Jumping': ['Skipping Rope', 'jump rope'],
};
// Popular exercises the library doesn't have. [id, name, group, mech, equipment, primary, secondary, aliases, steps]
const ADD = [
  ['gg_hack_squat_machine', 'Hack Squat Machine', 'Legs', 'c', 'machine', ['quadriceps'], ['glutes', 'hamstrings'], ['hack squat'], ['Stand on the platform with your back and shoulders against the pads.', 'Release the safety handles and bend your knees to lower down until your thighs are at least parallel.', 'Drive through your whole foot to stand back up without locking your knees hard.']],
  ['gg_pendulum_squat', 'Pendulum Squat', 'Legs', 'c', 'machine', ['quadriceps'], ['glutes'], ['pendulum'], ['Set the shoulder pads so you start standing tall.', 'Bend your knees and let the machine swing down until you are deep in the squat.', 'Push back up through mid-foot.']],
  ['gg_smith_squat', 'Smith Machine Squat', 'Legs', 'c', 'machine', ['quadriceps'], ['glutes', 'hamstrings'], ['smith squat'], ['Set the bar at shoulder height and step under it with your feet slightly in front.', 'Unrack and squat down under control until your thighs are parallel.', 'Push back up and re-rack by twisting the bar.']],
  ['gg_belt_squat', 'Belt Squat', 'Legs', 'c', 'machine', ['quadriceps', 'glutes'], ['hamstrings'], ['belt squat'], ['Attach the belt around your hips and stand on the platform.', 'Squat down keeping your chest up, then stand back up.']],
  ['gg_hip_thrust_machine', 'Hip Thrust Machine', 'Legs', 'c', 'machine', ['glutes'], ['hamstrings'], ['glute drive', 'hip thrust'], ['Sit with your upper back on the pad and the belt or pad across your hips.', 'Drive your hips up until your body is straight from knees to shoulders, squeeze your glutes.', 'Lower under control.']],
  ['gg_reverse_lunge', 'Reverse Lunge', 'Legs', 'c', 'dumbbell', ['quadriceps', 'glutes'], ['hamstrings'], ['lunge'], ['Hold dumbbells by your sides.', 'Step one foot back and lower until both knees are about 90 degrees.', 'Push through the front foot to return and switch legs.']],
  ['gg_curtsy_lunge', 'Curtsy Lunge', 'Legs', 'c', 'body only', ['glutes'], ['quadriceps', 'adductors'], ['lunge'], ['Step one leg behind and across the other, like a curtsy.', 'Lower until your front thigh is near parallel, then return.']],
  ['gg_nordic_curl', 'Nordic Hamstring Curl', 'Legs', 'i', 'body only', ['hamstrings'], ['glutes'], ['nordic'], ['Kneel with your ankles held under a pad or by a partner.', 'Lower your body forward as slowly as you can, keeping hips straight.', 'Catch yourself with your hands and push back up.']],
  ['gg_wall_sit', 'Wall Sit', 'Legs', 'i', 'body only', ['quadriceps'], ['glutes'], ['wall squat'], ['Lean your back against a wall and slide down until your knees are at 90 degrees.', 'Hold the position for time.']],
  ['gg_box_jump', 'Box Jumps', 'Legs', 'c', 'other', ['quadriceps'], ['glutes', 'calves'], ['plyo'], ['Stand in front of a sturdy box.', 'Swing your arms and jump onto the box, landing softly.', 'Step back down and repeat.']],
  ['gg_seated_row_machine', 'Seated Row Machine', 'Back', 'c', 'machine', ['middle back'], ['lats', 'biceps'], ['machine row', 'row machine'], ['Sit with your chest against the pad and grab the handles.', 'Pull the handles to your body, squeezing your shoulder blades together.', 'Return slowly.']],
  ['gg_chest_supported_row', 'Chest-Supported Dumbbell Row', 'Back', 'c', 'dumbbell', ['middle back'], ['lats', 'biceps'], ['incline row', 'seal row'], ['Lie face down on an incline bench holding dumbbells.', 'Row the dumbbells up to your sides, then lower.']],
  ['gg_lat_pulldown_machine', 'Lat Pulldown Machine (Plate Loaded)', 'Back', 'c', 'machine', ['lats'], ['biceps', 'middle back'], ['pulldown'], ['Sit with your thighs under the pads.', 'Pull the handles down to your upper chest, then let them rise slowly.']],
  ['gg_assisted_pullup_machine', 'Assisted Pull-up Machine', 'Back', 'c', 'machine', ['lats'], ['biceps', 'middle back'], ['assisted pullup', 'gravitron'], ['Kneel or stand on the platform and choose the assistance weight.', 'Pull yourself up until your chin is over the bar, then lower slowly.']],
  ['gg_straight_arm_pulldown', 'Straight-Arm Pulldown', 'Back', 'i', 'cable', ['lats'], [], ['lat prayer', 'pullover'], ['Hold a bar or rope at a high cable with straight arms.', 'Sweep it down to your thighs keeping your arms straight, then return.']],
  ['gg_dead_hang', 'Dead Hang', 'Back', 'i', 'body only', ['forearms'], ['lats'], ['hang', 'grip'], ['Hang from a pull-up bar with straight arms and hold for time.']],
  ['gg_back_ext_machine', 'Back Extension Machine', 'Back', 'i', 'machine', ['lower back'], ['glutes', 'hamstrings'], ['lower back machine'], ['Sit with the pad against your upper back.', 'Extend backwards until your body is straight, then return slowly.']],
  ['gg_reverse_pec_deck', 'Reverse Pec Deck', 'Shoulders', 'i', 'machine', ['shoulders'], ['middle back'], ['rear delt machine', 'reverse fly machine'], ['Sit facing the pad and hold the handles in front of you.', 'Open your arms out and back, squeezing your rear shoulders, then return.']],
  ['gg_lateral_raise_machine', 'Lateral Raise Machine', 'Shoulders', 'i', 'machine', ['shoulders'], [], ['side raise machine'], ['Sit with the pads on the outside of your arms.', 'Raise your arms out to the sides to shoulder height, then lower slowly.']],
  ['gg_cable_lateral_raise', 'Cable Lateral Raise', 'Shoulders', 'i', 'cable', ['shoulders'], [], ['side raise', 'lateral raise'], ['Hold a low cable handle with the far hand.', 'Raise your arm out to the side to shoulder height, then lower.']],
  ['gg_landmine_press', 'Landmine Press', 'Shoulders', 'c', 'barbell', ['shoulders'], ['chest', 'triceps'], ['landmine'], ['Hold the end of a barbell anchored in a landmine at shoulder height.', 'Press it up and forward until your arm is straight, then lower.']],
  ['gg_smith_shoulder_press', 'Smith Machine Shoulder Press', 'Shoulders', 'c', 'machine', ['shoulders'], ['triceps'], ['smith press'], ['Sit under the bar on an upright bench.', 'Press the bar overhead, then lower to chin height.']],
  ['gg_pec_fly_cable_low', 'Low-to-High Cable Fly', 'Chest', 'i', 'cable', ['chest'], ['shoulders'], ['upper chest fly'], ['Set the pulleys low and hold one handle in each hand.', 'Bring your hands up and together in front of your chest, then return.']],
  ['gg_incline_smith_press', 'Incline Smith Machine Press', 'Chest', 'c', 'machine', ['chest'], ['shoulders', 'triceps'], ['incline smith'], ['Set an incline bench under the Smith bar.', 'Lower the bar to your upper chest and press it back up.']],
  ['gg_decline_dumbbell_press', 'Decline Dumbbell Press', 'Chest', 'c', 'dumbbell', ['chest'], ['triceps'], ['lower chest'], ['Lie on a decline bench with dumbbells over your chest.', 'Lower them to the sides of your chest and press back up.']],
  ['gg_bicep_curl_machine', 'Bicep Curl Machine', 'Arms', 'i', 'machine', ['biceps'], [], ['curl machine', 'preacher machine'], ['Sit with your upper arms on the pad.', 'Curl the handles up, squeeze, and lower slowly.']],
  ['gg_cable_hammer_curl', 'Cable Rope Hammer Curl', 'Arms', 'i', 'cable', ['biceps'], ['forearms'], ['rope curl', 'hammer curl'], ['Hold a rope on a low cable with palms facing each other.', 'Curl up to your shoulders and lower.']],
  ['gg_tricep_ext_machine', 'Tricep Extension Machine', 'Arms', 'i', 'machine', ['triceps'], [], ['triceps machine'], ['Sit with your arms on the pad and hands on the handles.', 'Straighten your arms fully, then return slowly.']],
  ['gg_single_arm_pushdown', 'Single-Arm Cable Pushdown', 'Arms', 'i', 'cable', ['triceps'], [], ['pushdown'], ['Hold a single handle on a high cable.', 'Push down until your arm is straight, then return.']],
  ['gg_wrist_curl', 'Wrist Curl', 'Arms', 'i', 'dumbbell', ['forearms'], [], ['forearm curl'], ['Rest your forearms on your thighs holding dumbbells, palms up.', 'Curl your wrists up and lower.']],
  ['gg_rotary_torso', 'Rotary Torso Machine', 'Core', 'i', 'machine', ['abdominals'], [], ['obliques machine', 'twist machine'], ['Sit and set the rotation, then twist your torso against the resistance and return.']],
  ['gg_side_plank', 'Side Plank', 'Core', 'i', 'body only', ['abdominals'], [], ['obliques'], ['Lie on your side, prop yourself up on your forearm and lift your hips.', 'Hold, then switch sides.']],
  ['gg_bicycle_crunch', 'Bicycle Crunches', 'Core', 'i', 'body only', ['abdominals'], [], ['abs'], ['Lie on your back with hands by your head.', 'Bring opposite elbow and knee together, alternating sides.']],
  ['gg_leg_raise_lying', 'Lying Leg Raise', 'Core', 'i', 'body only', ['abdominals'], [], ['abs', 'lower abs'], ['Lie flat, legs straight.', 'Raise your legs to vertical and lower slowly without touching the floor.']],
  ['gg_captains_chair', "Captain's Chair Leg Raise", 'Core', 'i', 'machine', ['abdominals'], [], ['knee raise', 'vertical knee raise'], ['Support yourself on the forearm pads.', 'Raise your knees to your chest and lower slowly.']],
  ['gg_v_up', 'V-ups', 'Core', 'i', 'body only', ['abdominals'], [], ['abs'], ['Lie flat, then lift your legs and torso together to touch your feet, and lower.']],
  ['gg_burpees', 'Burpees', 'Cardio', 'c', 'body only', ['quadriceps'], ['chest', 'shoulders', 'abdominals'], ['hiit'], ['From standing, drop into a push-up position, do a push-up, jump your feet in and jump up.']],
  ['gg_jumping_jacks', 'Jumping Jacks', 'Cardio', 'c', 'body only', ['calves'], ['shoulders'], ['star jumps'], ['Jump your feet out while raising your arms overhead, then back in.']],
  ['gg_battle_ropes', 'Battle Ropes', 'Cardio', 'c', 'other', ['shoulders'], ['forearms', 'abdominals'], ['ropes'], ['Hold a rope end in each hand and make fast waves for time.']],
  ['gg_kb_swing_2h', 'Kettlebell Swing', 'Legs', 'c', 'kettlebells', ['glutes', 'hamstrings'], ['lower back', 'shoulders'], ['kb swing', 'russian swing'], ['Hinge at your hips and swing the kettlebell between your legs.', 'Snap your hips forward to swing it to chest height, then let it fall back.']],
  ['gg_sled_pull', 'Sled Pull', 'Legs', 'c', 'other', ['hamstrings', 'quadriceps'], ['glutes', 'calves'], ['sled drag'], ['Attach a rope or harness to the sled and pull it hand over hand or walk backwards.']],
];
const byId = new Map(L.map(x => [x.id, x]));
let renamed = 0;
for (const [id, [name, ...al]] of Object.entries(NAMES)) {
  const x = byId.get(id); if (!x) { console.warn('missing', id); continue; }
  const orig = x.o || x.n; x.o = orig; x.n = name; x.a = [...new Set([orig.toLowerCase(), ...al])]; renamed++;
  if (x.pop == null) x.pop = 500 + renamed;
}
// General tidy-ups for everything else.
for (const x of L) {
  if (NAMES[x.id]) continue;
  const orig = x.o || x.n; let n = orig;
  n = n.replace(/ - Medium Grip$/i, '').replace(/\bPushups?\b/i, m => /s$/.test(m) ? 'Push-ups' : 'Push-up').replace(/\bFlyes\b/g, 'Flies').replace(/\bFlye\b/g, 'Fly');
  if (n !== orig) { x.o = orig; x.n = n; x.a = [orig.toLowerCase()]; }
}
let added = 0;
for (const [id, n, g, m, e, p, s, a, i] of ADD) {
  if (byId.has(id)) continue;
  L.push({ id, n, g, m, e, p, s, l: 'beginner', c: g === 'Cardio' ? 'cardio' : 'strength', i, a, pop: 400 + added }); added++;
}
L.sort((x, y) => ((x.pop ?? 1e9) - (y.pop ?? 1e9)) || x.n.localeCompare(y.n));
const head = '// Exercise library: free-exercise-db by yuhonas (public domain, The Unlicense), renamed to everyday gym names\n// with extra machine exercises added by GG Gains (native/exercise-names.mjs). Demo photos load from the same project.\n';
fs.writeFileSync(FILE, head + 'window.GG_EXERCISES = ' + JSON.stringify(L) + ';\n');
console.log('renamed', renamed, 'added', added, 'total', L.length);
