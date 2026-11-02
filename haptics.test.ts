import {trigger, triggerPattern} from 'react-native-haptic-feedback';
import {celebrate, refuse} from './haptics';

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

test('Haptics never break the app', () => {
  (trigger as jest.Mock).mockImplementationOnce(() => {
    throw new Error('no haptic engine');
  });
  expect(() => refuse()).not.toThrow();
});
