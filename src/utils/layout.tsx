import { createSignal, onCleanup, onMount } from "solid-js";

export const useElementWidth =(): [() => number, (el: HTMLElement) => void]  => {
    const [width, setWidth] = createSignal(0);
    let elementRef: HTMLElement;

    const updateWidth = () => setWidth(elementRef.offsetWidth);

    onMount(() => {
        window.addEventListener('resize', updateWidth);
        updateWidth(); // Initialize width
    });

    onCleanup(() => {
        window.removeEventListener('resize', updateWidth);
    });

    return [() => width(), (el: HTMLElement) => { elementRef = el; updateWidth() }];
}