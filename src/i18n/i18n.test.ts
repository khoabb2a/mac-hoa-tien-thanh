import { describe, expect, it } from 'vitest';
import vi from './vi.json';
import en from './en.json';

describe('i18n', () => {
  it('tiếng Việt và tiếng Anh có cùng bộ khóa', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });
});
