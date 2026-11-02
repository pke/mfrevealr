import {trigger, triggerPattern} from 'react-native-haptic-feedback';
import {celebrate, foundNew, refuse} from './haptics';

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  triggerPattern: jest.fn(),
}));

test('A code the app ignores buzzes like an error', () => {
  refuse();
  expect(trigger).toHaveBeenCalledWith('notificationError');
});

test('A completed series thumps with a strong pattern', () => {
  celebrate();
  const [events] = (triggerPattern as jest.Mock).mock.calls[0];
  expect(events[0]).toMatchObject({intensity: 1});
});

test('Each newly found figure gets its own tap', () => {
  (triggerPattern as jest.Mock).mockClear();
  foundNew(3);
  const [events] = (triggerPattern as jest.Mock).mock.calls[0];
  expect(events).toHaveLength(3);
  const times = events.map((event: {time: number}) => event.time);
  // Far enough apart to be felt one by one.
  expect(times[1] - times[0]).toBeGreaterThanOrEqual(150);
  expect(times[2] - times[1]).toBe(times[1] - times[0]);
  for (const event of events) {
    expect(event).toMatchObject({type: 'transient', intensity: 1});
  }
});

test('Nothing new found, nothing felt', () => {
  (triggerPattern as jest.Mock).mockClear();
  foundNew(0);
  expect(triggerPattern).not.toHaveBeenCalled();
});

test('Haptics never break the app', () => {
  (trigger as jest.Mock).mockImplementationOnce(() => {
    throw new Error('no haptic engine');
  });
  expect(() => refuse()).not.toThrow();
});
