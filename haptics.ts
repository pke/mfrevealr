import {trigger, triggerPattern} from 'react-native-haptic-feedback';

/**
 * A full series: one hard bang with a short rumble, as the confetti goes
 * off, then two hits as it settles.
 */
export function celebrate() {
  try {
    triggerPattern([
      {time: 0, type: 'transient', intensity: 1, sharpness: 1},
      {
        time: 0,
        type: 'continuous',
        duration: 200,
        intensity: 1,
        sharpness: 0.4,
      },
      {time: 300, type: 'transient', intensity: 0.9, sharpness: 0.8},
      {time: 450, type: 'transient', intensity: 0.7, sharpness: 0.8},
    ]);
  } catch {}
}

/** A code the app ignores: no box, or one no catalog knows. */
export function refuse() {
  try {
    trigger('notificationError');
  } catch {}
}
