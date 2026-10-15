import { describe, expect, it } from 'vitest';
import { opensAbove, scrollOptionIntoView } from './listbox';

function box(top: number, bottom: number) {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
  return element;
}

function list(heights: number[], clientHeight: number) {
  const element = document.createElement('ul');
  let top = 0;
  for (const height of heights) {
    const option = document.createElement('li');
    Object.defineProperties(option, { offsetTop: { value: top }, offsetHeight: { value: height } });
    top += height;
    element.append(option);
  }
  Object.defineProperties(element, { clientHeight: { value: clientHeight }, scrollHeight: { value: top } });
  return element;
}

describe('opensAbove', () => {
  it('opens below while the list fits under the trigger', () => {
    window.innerHeight = 800;
    expect(opensAbove(box(100, 140), list([40, 40, 40], 120))).toBe(false);
  });

  it('opens above when the list would run past the bottom and there is more room above', () => {
    window.innerHeight = 800;
    expect(opensAbove(box(700, 740), list([40, 40, 40], 120))).toBe(true);
  });

  it('stays below when there is even less room above', () => {
    window.innerHeight = 300;
    expect(opensAbove(box(100, 140), list([40, 40, 40, 40, 40], 200))).toBe(false);
  });
});

describe('scrollOptionIntoView', () => {
  it('scrolls the list down just enough to show an option below its view', () => {
    const element = list([40, 40, 40, 40, 40], 100);
    scrollOptionIntoView(element, 3);
    expect(element.scrollTop).toBe(60);
  });

  it('scrolls the list up to an option above its view', () => {
    const element = list([40, 40, 40, 40, 40], 100);
    element.scrollTop = 120;
    scrollOptionIntoView(element, 1);
    expect(element.scrollTop).toBe(40);
  });

  it('leaves the list alone when the option is already visible, and ignores a missing option', () => {
    const element = list([40, 40, 40, 40, 40], 100);
    element.scrollTop = 40;
    scrollOptionIntoView(element, 2);
    scrollOptionIntoView(element, 9);
    expect(element.scrollTop).toBe(40);
  });
});
