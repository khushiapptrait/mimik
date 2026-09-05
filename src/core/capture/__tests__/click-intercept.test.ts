// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { replayClick, replayInit, shouldInterceptClick } from '@/core/capture/events/click-intercept';

function el(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  return host.firstElementChild as HTMLElement;
}

function click(over: Partial<MouseEventInit> & { isTrusted?: boolean } = {}): MouseEvent {
  return {
    isTrusted: true,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    button: 0,
    buttons: 1,
    detail: 1,
    clientX: 40,
    clientY: 90,
    screenX: 0,
    screenY: 0,
    ...over,
  } as MouseEvent;
}

describe('shouldInterceptClick', () => {
  it('returns false for ordinary clicks so native state changes and event listeners execute naturally', () => {
    expect(shouldInterceptClick(el('<button>Copy link</button>'), click())).toBe(false);
  });

  it('returns false for synthetic replayed clicks', () => {
    expect(shouldInterceptClick(el('<button>Copy link</button>'), click({ isTrusted: false }))).toBe(false);
  });

  it('returns false for shift-clicks', () => {
    expect(shouldInterceptClick(el('<button>Copy link</button>'), click({ shiftKey: true }))).toBe(false);
  });

  it('returns false for native dropdowns', () => {
    expect(shouldInterceptClick(el('<select><option>a</option></select>'), click())).toBe(false);
    expect(shouldInterceptClick(el('<option>a</option>'), click())).toBe(false);
  });

  it('returns false for contenteditable surfaces', () => {
    const editable = el('<div contenteditable="true">notes</div>');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(shouldInterceptClick(editable, click())).toBe(false);
  });

  it('returns false for text fields and checkboxes', () => {
    expect(shouldInterceptClick(el('<input type="text">'), click())).toBe(false);
    expect(shouldInterceptClick(el('<input type="checkbox">'), click())).toBe(false);
  });
});

describe('replayInit', () => {
  it('carries the pointer position through to the replayed click', () => {
    const init = replayInit(click({ clientX: 120, clientY: 340 }));
    expect(init).toMatchObject({ clientX: 120, clientY: 340, bubbles: true, cancelable: true });
  });

  it('preserves the modifier keys the page may branch on', () => {
    const init = replayInit(click({ ctrlKey: true, metaKey: true, altKey: true, button: 1 }));
    expect(init).toMatchObject({ ctrlKey: true, metaKey: true, altKey: true, button: 1 });
  });

  it('reaches a delegated listener on the document as an untrusted click', () => {
    const button = el('<button>Copy link</button>');
    const seen: Array<{ trusted: boolean; x: number }> = [];
    document.addEventListener('click', (e) => seen.push({ trusted: e.isTrusted, x: (e as MouseEvent).clientX }), {
      once: true,
    });
    replayClick(button, replayInit(click({ clientX: 77 })));
    expect(seen).toEqual([{ trusted: false, x: 77 }]);
  });

  it('focuses the target first, the way a real click would', () => {
    const button = el('<button>Copy link</button>');
    replayClick(button, replayInit(click()));
    expect(document.activeElement).toBe(button);
  });
});
