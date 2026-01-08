import React from 'react';
import { create } from 'react-test-renderer';
import App from '../App';

test('App renders without crashing', () => {
  const tree = create(<App />).toJSON();
  expect(tree).toBeTruthy();
});
