// Select.tsx dropdown positioning. 288 px is the list's max-height in select.css.
const MAX_LIST_HEIGHT = 288;

/** Opens above its trigger when the list would not fit below and there is more room above. */
export function opensAbove(trigger: HTMLElement, list: HTMLElement) {
  const box = trigger.getBoundingClientRect();
  const below = window.innerHeight - box.bottom;
  return below < Math.min(list.scrollHeight, MAX_LIST_HEIGHT) + 12 && box.top > below;
}

/** Shows the option at `index` by scrolling the list only: scrollIntoView also moved the page. */
export function scrollOptionIntoView(list: HTMLElement, index: number) {
  const option = list.children[index] as HTMLElement | undefined;
  if (!option) return;
  const bottom = option.offsetTop + option.offsetHeight;
  if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
}
