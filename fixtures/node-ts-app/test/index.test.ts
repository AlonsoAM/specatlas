import { expect, test } from 'vitest'
import { greet } from '../src/index'

test('saluda', () => {
  expect(greet('SpecAtlas')).toBe('Hola, SpecAtlas')
})
