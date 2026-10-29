import { describe, expect, it } from 'vitest';
import { decodeProfile, emptyProfile } from './research-data';
import { validSourceUrl } from './community-data';

describe('research profile publication boundary', () => {
  it('keeps server-owned and private account fields out of editable drafts', () => {
    const draft = decodeProfile({ ...emptyProfile('A reader'), user_id: 'server-id', published: true, updated_at: 'server-time', email: 'private@example.test', search_document: 'server-index' });
    expect(draft).not.toBeNull();
    expect(Object.keys(draft!).sort()).toEqual(Object.keys(emptyProfile()).sort());
    expect(draft).not.toHaveProperty('user_id');
    expect(draft).not.toHaveProperty('email');
    expect(draft).not.toHaveProperty('published');
    expect(draft).not.toHaveProperty('updated_at');
  });
  it('rejects malformed saved records before they reach profile controls', () => {
    expect(decodeProfile(null)).toBeNull();
    expect(decodeProfile({ ...emptyProfile(), display_name: { unsafe: 'value' } })).toBeNull();
    expect(decodeProfile({ ...emptyProfile(), interests: [42] })).toBeNull();
  });
  it('normalizes a saved record without mutating it or inventing interests', () => {
    const record = { ...emptyProfile('Reader'), interests: ['ML systems', 'ML systems', 'Unrecognized tag'], looking_for: 'Invalid goal' };
    const draft = decodeProfile(record)!;
    expect(draft.interests).toEqual(['ML systems']);
    expect(draft.looking_for).toBe('Learning together');
    expect(record.interests).toHaveLength(3);
  });
});

describe('source links in research drafts', () => {
  it('allows optional HTTPS references and rejects executable or malformed links', () => {
    expect(validSourceUrl('')).toBe(true);
    expect(validSourceUrl('https://arxiv.org/abs/2205.14135')).toBe(true);
    for (const link of ['javascript:alert(1)', 'data:text/html,test', 'http://example.test', 'https://example.test/a b', 'not a URL']) expect(validSourceUrl(link)).toBe(false);
  });
});
